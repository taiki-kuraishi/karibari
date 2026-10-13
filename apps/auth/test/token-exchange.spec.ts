import {
  apiAudience,
  config,
  createAuthDatabase,
  mcpAudience,
  tokenExchangeGrantType,
} from "@karibari/better-auth";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { env, exports } from "cloudflare:workers";
import * as v from "valibot";
import { afterEach, describe, expect, test } from "vitest";

const accessTokenType = "urn:ietf:params:oauth:token-type:access_token";
const redirectUri = "http://localhost:9999/cb";
const origin = "https://auth.karibari.tsar-bmb.org";
const tokenUrl = `${origin}/api/auth/oauth2/token`;

// Same secret the setup file seeds into the Secrets Store, so cookies signed here are valid in the Worker.
const testAuth = betterAuth({
  ...config,
  basePath: "/api/auth",
  baseURL: origin,
  database: createAuthDatabase(env.DB),
  plugins: [...config.plugins, testUtils()],
  secret: await env.BETTER_AUTH_SECRET.get(),
});

const clientSchema = v.object({ client_id: v.string(), client_secret: v.optional(v.string(), "") });
const consentSchema = v.object({
  url: v.optional(v.string()),
  redirect_uri: v.optional(v.string()),
});

const post = async (path: string, body: BodyInit, headers: Record<string, string>) =>
  exports.default.fetch(
    new Request(`${origin}/api/auth${path}`, {
      method: "POST",
      headers: new Headers({ origin, ...headers }),
      body,
    }),
  );

const registerClient = async (body: Record<string, unknown>) => {
  const response = await post(
    "/oauth2/register",
    JSON.stringify({
      application_type: "native",
      redirect_uris: [redirectUri],
      resources: [mcpAudience, apiAudience],
      ...body,
    }),
    { "content-type": "application/json" },
  );
  const json = v.parse(clientSchema, await response.json());

  return { clientId: json.client_id, clientSecret: json.client_secret };
};

const registerExchangeClient = async (grantTypes: string[] = [tokenExchangeGrantType]) =>
  registerClient({ token_endpoint_auth_method: "client_secret_basic", grant_types: grantTypes });

const claimsSchema = v.object({ aud: v.unknown(), scope: v.string(), sub: v.string() });
const tokenResponseSchema = v.looseObject({
  access_token: v.string(),
  token_type: v.string(),
  issued_token_type: v.string(),
  expires_in: v.number(),
});

const decodeClaims = (jwt: string) => {
  const payload = (jwt.split(".")[1] ?? "").replaceAll("-", "+").replaceAll("_", "/");

  return v.parse(claimsSchema, JSON.parse(atob(payload)));
};

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCodePoint(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

// Drives register -> authorize -> consent -> token for a fresh user and returns the MCP access token.
// The consent page is skipped: its form only posts the signed query of the authorize redirect.
const issueMcpToken = async () => {
  const userId = crypto.randomUUID();
  const context = await testAuth.$context;
  const user = context.test.createUser({
    id: userId,
    email: `${userId}@example.com`,
    emailVerified: true,
    name: "Test User",
  });
  await context.test.saveUser(user);
  const session = await context.test.getAuthHeaders({ userId });

  const { clientId } = await registerClient({
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code"],
  });
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64Url(new Uint8Array(digest));
  const authorizeUrl = new URL(`${origin}/api/auth/oauth2/authorize`);
  for (const [key, value] of Object.entries({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email offline_access",
    state: "s",
    resource: mcpAudience,
    code_challenge: challenge,
    code_challenge_method: "S256",
  })) {
    authorizeUrl.searchParams.set(key, value);
  }
  const authorized = await exports.default.fetch(
    new Request(authorizeUrl, { headers: session, redirect: "manual" }),
  );
  const oauthQuery = new URL(authorized.headers.get("location") ?? "", origin).search;

  const consent = await post(
    "/oauth2/consent",
    JSON.stringify({ accept: true, oauth_query: oauthQuery }),
    { "content-type": "application/json", cookie: session.get("cookie") ?? "" },
  );
  const consentBody = v.parse(consentSchema, await consent.json());
  const redirect = new URL(consentBody.url ?? consentBody.redirect_uri ?? "", origin);
  const code = redirect.searchParams.get("code");

  const token = await post(
    "/oauth2/token",
    new URLSearchParams({
      grant_type: "authorization_code",
      code: code ?? "",
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
    { "content-type": "application/x-www-form-urlencoded" },
  );
  const { access_token: accessToken } = v.parse(
    v.object({ access_token: v.string() }),
    await token.json(),
  );

  return { accessToken, userId };
};

const exchange = async (args: {
  client?: Awaited<ReturnType<typeof registerClient>>;
  params: Record<string, string>;
  secret?: string;
}) => {
  const headers = new Headers({ origin, "content-type": "application/x-www-form-urlencoded" });

  if (args.client !== undefined) {
    const secret = args.secret ?? args.client.clientSecret;
    headers.set("authorization", `Basic ${btoa(`${args.client.clientId}:${secret}`)}`);
  }

  return exports.default.fetch(
    new Request(tokenUrl, {
      method: "POST",
      headers,
      body: new URLSearchParams({ grant_type: tokenExchangeGrantType, ...args.params }),
    }),
  );
};

const validParams = (subjectToken: string) => ({
  subject_token: subjectToken,
  subject_token_type: accessTokenType,
  resource: apiAudience,
});

describe("token exchange grant", () => {
  afterEach(() => {
    env.TOKEN_EXCHANGE_CLIENT_IDS = "";
  });

  test("200: exchanges an MCP token for an API-only token without id or refresh token", async () => {
    // Arrange
    const { accessToken, userId } = await issueMcpToken();
    const client = await registerExchangeClient();
    env.TOKEN_EXCHANGE_CLIENT_IDS = client.clientId;
    // Act
    const response = await exchange({ client, params: validParams(accessToken) });
    const body = v.parse(tokenResponseSchema, await response.json());
    const claims = decodeClaims(body.access_token);
    const scopes = claims.scope.split(" ");

    // Assert
    expect(response.status).toBe(200);
    expect(body.token_type).toBe("Bearer");
    expect(body.issued_token_type).toBe(accessTokenType);
    expect(typeof body.expires_in).toBe("number");
    expect(body.id_token).toBeUndefined();
    expect(body.refresh_token).toBeUndefined();
    expect(claims.aud).toStrictEqual(apiAudience);
    expect(claims.sub).toBe(userId);
    expect(scopes).not.toContain("openid");
    expect(scopes).not.toContain("offline_access");
  });

  test("400 invalid_request: subject_token whose audience is not MCP", async () => {
    // Arrange
    const client = await registerExchangeClient();
    env.TOKEN_EXCHANGE_CLIENT_IDS = client.clientId;
    const { accessToken } = await issueMcpToken();
    const exchanged = await exchange({ client, params: validParams(accessToken) });
    const { access_token: apiToken } = v.parse(
      v.object({ access_token: v.string() }),
      await exchanged.json(),
    );
    // Act
    const response = await exchange({ client, params: validParams(apiToken) });

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_request" });
  });

  test("400 invalid_request: subject_token_type other than access_token", async () => {
    // Arrange
    const { accessToken } = await issueMcpToken();
    const client = await registerExchangeClient();
    env.TOKEN_EXCHANGE_CLIENT_IDS = client.clientId;
    // Act
    const response = await exchange({
      client,
      params: {
        ...validParams(accessToken),
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      },
    });

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_request" });
  });

  test("400 invalid_request: no client authentication at all", async () => {
    // Arrange
    const { accessToken } = await issueMcpToken();
    // Act
    const response = await exchange({ params: validParams(accessToken) });

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_request" });
  });

  test("401 invalid_client: wrong client secret", async () => {
    // Arrange
    const { accessToken } = await issueMcpToken();
    const client = await registerExchangeClient();
    env.TOKEN_EXCHANGE_CLIENT_IDS = client.clientId;
    // Act
    const response = await exchange({
      client,
      secret: "wrong-secret",
      params: validParams(accessToken),
    });

    // Assert
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "invalid_client" });
  });

  test("400 unauthorized_client: allow-listed client without the grant registered", async () => {
    // Arrange
    const { accessToken } = await issueMcpToken();
    const client = await registerExchangeClient(["authorization_code"]);
    env.TOKEN_EXCHANGE_CLIENT_IDS = client.clientId;
    // Act
    const response = await exchange({ client, params: validParams(accessToken) });

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "unauthorized_client" });
  });

  test("400 unauthorized_client: another DCR client with the grant and a correct secret", async () => {
    // Arrange
    const { accessToken } = await issueMcpToken();
    const allowed = await registerExchangeClient();
    const stranger = await registerExchangeClient();
    env.TOKEN_EXCHANGE_CLIENT_IDS = allowed.clientId;
    // Act
    const response = await exchange({ client: stranger, params: validParams(accessToken) });

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "unauthorized_client" });
  });

  test("400 unauthorized_client: nobody may exchange while the allow-list is empty", async () => {
    // Arrange
    const { accessToken } = await issueMcpToken();
    const client = await registerExchangeClient();
    // Act
    const response = await exchange({ client, params: validParams(accessToken) });

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "unauthorized_client" });
  });

  test("400 invalid_target: resource other than the API", async () => {
    // Arrange
    const { accessToken } = await issueMcpToken();
    const client = await registerExchangeClient();
    env.TOKEN_EXCHANGE_CLIENT_IDS = client.clientId;
    // Act
    const response = await exchange({
      client,
      params: { ...validParams(accessToken), resource: mcpAudience },
    });

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_target" });
  });
});
