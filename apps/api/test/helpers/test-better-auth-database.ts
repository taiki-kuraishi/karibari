import { config, createAuthDatabase } from "@karibari/better-auth";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import * as v from "valibot";

const TEST_SECRET = "karibari-test-secret-at-least-thirty-two-characters";
const REDIRECT_URI = "http://localhost:9999/cb";
const createTestBetterAuth = (args: { baseURL: string; database: D1Database }) =>
  betterAuth({
    ...config,
    basePath: "/api/auth",
    baseURL: args.baseURL,
    database: createAuthDatabase(args.database),
    // Keep the real jwt/oauthProvider plugins: the bearer tests drive the actual
    // OAuth flow, so the token must be minted the same way production issues it.
    plugins: [...config.plugins, testUtils()],
    secret: TEST_SECRET,
  });

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const sha256Base64Url = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const bytes = new Uint8Array(digest);

  return toBase64Url(bytes);
};

export class TestBetterAuthDatabase {
  readonly #auth: ReturnType<typeof createTestBetterAuth>;
  readonly #baseURL: string;

  public constructor(args: { baseURL: string; database: D1Database }) {
    this.#baseURL = args.baseURL;
    this.#auth = createTestBetterAuth(args);
  }

  public async fetch(input: RequestInfo | URL, init?: RequestInit) {
    return this.#auth.handler(new Request(input, init));
  }

  public async getAuthHeaders(args: { userId: string }) {
    const context = await this.#auth.$context;
    const { test } = context;
    const user = test.createUser({
      id: args.userId,
      email: `${args.userId}@example.com`,
      emailVerified: true,
      name: "Test User",
    });

    await test.saveUser(user);

    return test.getAuthHeaders({ userId: user.id });
  }

  // Better-auth rejects state-changing requests without an Origin header.
  async #post(
    path: string,
    body: string,
    contentType: string,
    extraHeaders: HeadersInit = {},
  ): Promise<Response> {
    const headers = new Headers({
      "content-type": contentType,
      origin: new URL(this.#baseURL).origin,
    });
    for (const [key, value] of new Headers(extraHeaders)) {
      headers.set(key, value);
    }

    return this.#auth.handler(
      new Request(`${this.#baseURL}${path}`, { method: "POST", headers, body }),
    );
  }

  // Drives the real OAuth flow (register → authorize → consent → token) over
  // Plain HTTP against the test auth instance and returns a Bearer access
  // Token. The consent React page is skipped on purpose: its form only posts
  // `oauth_query`, which is the signed query of the authorize 302's Location.
  public async getBearerToken(args: { audience: string; userId: string }): Promise<string> {
    const sessionHeaders = await this.getAuthHeaders({ userId: args.userId });

    // No session cookie here: a signed-in registration triggers the admin
    // Privilege check (assertClientPrivileges), while anonymous registration is
    // Allowed by the config.
    const registerResponse = await this.#post(
      "/oauth2/register",
      JSON.stringify({
        application_type: "native",
        redirect_uris: [REDIRECT_URI],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code"],
      }),
      "application/json",
    );
    if (!registerResponse.ok) {
      throw new Error(
        `client registration failed: ${registerResponse.status} ${await registerResponse.text()}`,
      );
    }
    const registered = v.parse(v.object({ client_id: v.string() }), await registerResponse.json());

    const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = await sha256Base64Url(verifier);
    const authorizeUrl = new URL(`${this.#baseURL}/oauth2/authorize`);
    const authorizeParams: Record<string, string> = {
      response_type: "code",
      client_id: registered.client_id,
      redirect_uri: REDIRECT_URI,
      state: "test-state",
      resource: args.audience,
      code_challenge: challenge,
      code_challenge_method: "S256",
    };
    for (const [key, value] of Object.entries(authorizeParams)) {
      authorizeUrl.searchParams.set(key, value);
    }
    const authorizeResponse = await this.#auth.handler(
      new Request(authorizeUrl, { headers: sessionHeaders }),
    );
    const location = authorizeResponse.headers.get("location");
    if (authorizeResponse.status !== 302 || location === null) {
      throw new Error(`authorize did not redirect: ${authorizeResponse.status}`);
    }
    const oauthQuery = new URL(location, this.#baseURL).search;

    const consentResponse = await this.#post(
      "/oauth2/consent",
      JSON.stringify({ accept: true, oauth_query: oauthQuery }),
      "application/json",
      sessionHeaders,
    );
    if (!consentResponse.ok) {
      throw new Error(`consent failed: ${consentResponse.status} ${await consentResponse.text()}`);
    }
    // The SDK's client wrapper exposes the redirect under `url` while the raw
    // Endpoint documents it as `redirect_uri`, so accept either.
    const consentSchema = v.object({
      url: v.optional(v.string()),
      redirect_uri: v.optional(v.string()),
    });
    const consentBody = v.parse(consentSchema, await consentResponse.json());
    const redirectUri = [consentBody.url, consentBody.redirect_uri].find(
      (value): value is string => typeof value === "string",
    );
    if (redirectUri === undefined) {
      throw new Error(`consent carries no redirect: ${JSON.stringify(consentBody)}`);
    }
    const code = new URL(redirectUri, this.#baseURL).searchParams.get("code");
    if (code === null) {
      throw new Error(`consent redirect carries no code: ${redirectUri}`);
    }

    const tokenResponse = await this.#post(
      "/oauth2/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: registered.client_id,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      }).toString(),
      "application/x-www-form-urlencoded",
    );
    if (!tokenResponse.ok) {
      throw new Error(`token exchange failed: ${tokenResponse.status}`);
    }
    const tokenContentType = tokenResponse.headers.get("content-type") ?? "";
    const tokenBody = await tokenResponse.text();
    const accessToken = tokenContentType.includes("application/json")
      ? v.parse(v.object({ access_token: v.string() }), JSON.parse(tokenBody)).access_token
      : new URLSearchParams(tokenBody).get("access_token");
    if (accessToken === null || accessToken === "") {
      throw new Error(`token exchange carried no access_token: ${tokenBody}`);
    }

    return accessToken;
  }
}
