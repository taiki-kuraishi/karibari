import { env, exports } from "cloudflare:workers";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

const authOrigin = "https://auth.karibari.com";
const issuer = `${authOrigin}/api/auth`;
const tokenUrl = `${issuer}/oauth2/token`;
const jwksUrl = `${issuer}/jwks`;
const apiOrigin = "https://api.karibari.com";
const exchangedToken = "exchanged-api-token";

const encode = (value: ArrayBuffer | string) =>
  Buffer.from(typeof value === "string" ? value : new Uint8Array(value)).toString("base64url");

let mcpToken = "";
let jwks = { keys: [] as unknown[] };

beforeAll(async () => {
  const generated = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  if (!("privateKey" in generated)) {
    throw new Error("expected a key pair");
  }
  const pair = generated;
  const exported = await crypto.subtle.exportKey("jwk", pair.publicKey);
  if (exported instanceof ArrayBuffer) {
    throw new TypeError("expected a JWK");
  }
  const publicJwk = exported;
  jwks = {
    keys: [
      {
        alg: "ES256",
        crv: publicJwk.crv,
        kid: "test-key",
        kty: publicJwk.kty,
        use: "sig",
        x: publicJwk.x,
        y: publicJwk.y,
      },
    ],
  };

  const now = Math.floor(Date.now() / 1000);
  const signingInput = `${encode(JSON.stringify({ alg: "ES256", kid: "test-key", typ: "at+jwt" }))}.${encode(
    JSON.stringify({
      aud: "https://mcp.karibari.com/mcp",
      exp: now + 3600,
      iat: now,
      iss: issuer,
      sub: "user-1",
    }),
  )}`;
  const signature = await crypto.subtle.sign(
    { hash: "SHA-256", name: "ECDSA" },
    pair.privateKey,
    new TextEncoder().encode(signingInput),
  );
  mcpToken = `${signingInput}.${encode(signature)}`;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Stands in for auth (JWKS + token endpoint) and the API; returns what the API received.
const mockNetwork = (exchange: () => Response | Promise<Response>) => {
  const requests: Request[] = [];
  const forms: FormData[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = new Request(input, init);
    const { href } = new URL(request.url);

    if (href === jwksUrl) {
      return Response.json(jwks);
    }

    requests.push(request);

    if (href === tokenUrl) {
      forms.push(await request.formData());

      return await exchange();
    }

    return Response.json([]);
  });

  return { forms, requests };
};

const callListProjects = async () =>
  exports.default.fetch(
    new Request("http://remote-mcp/mcp", {
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "tools/call",
        params: { arguments: {}, name: "list_projects" },
      }),
      headers: {
        accept: "application/json, text/event-stream",
        authorization: `Bearer ${mcpToken}`,
        "content-type": "application/json",
      },
      method: "POST",
    }),
  );

describe("POST /mcp token exchange", () => {
  test("sends the exchanged token to the API", async () => {
    // Arrange
    const { forms, requests } = mockNetwork(() =>
      Response.json({ access_token: exchangedToken, expires_in: 60, token_type: "Bearer" }),
    );

    // Act
    const response = await callListProjects();

    // Assert
    const exchange = requests.find((request) => request.url === tokenUrl);
    const apiRequest = requests.find((request) => request.url.startsWith(apiOrigin));

    expect(response.status).toBe(200);
    expect(Object.fromEntries(forms[0] ?? [])).toStrictEqual({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      resource: "https://api.karibari.com/api",
      subject_token: mcpToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
    });
    expect(exchange?.headers.get("authorization")).toBe(
      `Basic ${btoa(`${env.MCP_CLIENT_ID}:test-client-secret`)}`,
    );
    expect(apiRequest?.headers.get("authorization")).toBe(`Bearer ${exchangedToken}`);
  });

  test("answers 401 with a challenge when auth rejects the subject_token", async () => {
    // Arrange
    mockNetwork(() => Response.json({ error: "invalid_request" }, { status: 400 }));

    // Act
    const response = await callListProjects();

    // Assert
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain(
      'resource_metadata="https://mcp.karibari.com/.well-known/oauth-protected-resource/mcp"',
    );
  });

  test.each([
    ["invalid_client", () => Response.json({ error: "invalid_client" }, { status: 401 })],
    ["unauthorized_client", () => Response.json({ error: "unauthorized_client" }, { status: 400 })],
    ["invalid_target", () => Response.json({ error: "invalid_target" }, { status: 400 })],
    ["an auth 5xx", () => new Response("boom", { status: 500 })],
    [
      "a network failure",
      () => {
        throw new TypeError("network down");
      },
    ],
  ])("answers 502 without a challenge on %s", async (_name, exchange) => {
    // Arrange
    mockNetwork(exchange);

    // Act
    const response = await callListProjects();

    // Assert
    expect(response.status).toBe(502);
    expect(response.headers.get("WWW-Authenticate")).toBeNull();
  });
});
