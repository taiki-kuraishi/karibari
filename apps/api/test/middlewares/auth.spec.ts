import type { FactoryReturn } from "@karibari/db-factory";

import { apiAudience } from "@karibari/better-auth";
import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { app } from "../../src/server";
import { createBearerHeaders, stubAuthFetch, testWithAuth } from "../helpers/auth-test";

describe("authMiddleware", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);

  type Project = FactoryReturn<"projects">;

  // The middleware is wired in `server.ts`, so the spec drives the real app and
  // Observes `userId` through the owner-filtered project list.
  const requestProjects = async (headers?: Headers) =>
    await app.request("/api/projects", { headers }, { ...env });
  const invalidAuthHeaders = (headers: Headers) => {
    const invalid = new Headers(headers);
    invalid.set("cookie", "better-auth.session_token=invalid-session");

    return invalid;
  };

  testWithAuth("200: sets the user id before continuing", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();

    // Act
    const response = await requestProjects(new Headers(auth.headers));
    const body = await response.json<{ projects: Project[] }>();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ projects: [project] });
  });

  testWithAuth("404: rejects a missing session", async () => {
    // Arrange
    // No Cookie header is sent.
    // Act
    const response = await requestProjects();
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  testWithAuth("404: rejects an invalid session", async ({ auth }) => {
    // Arrange
    const headers = invalidAuthHeaders(auth.headers);
    // Act
    const response = await requestProjects(headers);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  testWithAuth("404: fails closed when Auth is unavailable", async ({ auth }) => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Auth unavailable");
      }),
    );
    // Act
    const response = await requestProjects(auth.headers);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  describe("bearer", () => {
    // Happy-path tokens come from the real OAuth flow against a better-auth
    // Test instance. Only the expired case stays self-minted: the issuer owns
    // `exp`, and a real flow cannot produce it.
    const bearerHeaders = (token: string) => new Headers({ authorization: `Bearer ${token}` });
    const kid = "test-key";
    // oxlint-disable-next-line eslint/init-declarations -- Assigned in beforeAll.
    let keyPair: CryptoKeyPair;
    // oxlint-disable-next-line eslint/init-declarations -- Assigned in beforeAll.
    let jwks: { keys: Record<string, unknown>[] };

    beforeAll(async () => {
      const generated = await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"],
      );
      if (!("privateKey" in generated)) {
        throw new Error("ECDSA generation must return a key pair");
      }
      keyPair = generated;
      const exported = await crypto.subtle.exportKey("jwk", generated.publicKey);
      if (exported instanceof ArrayBuffer) {
        throw new Error("JWK export must return a key object");
      }
      const jwk = exported;
      jwks = {
        keys: [{ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, kid, alg: "ES256", use: "sig" }],
      };
    });
    const toBase64Url = (bytes: Uint8Array): string => {
      let binary = "";
      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }

      return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    };
    const mintBearer = async (claims: Record<string, unknown>): Promise<string> => {
      const encoder = new TextEncoder();
      const header = toBase64Url(encoder.encode(JSON.stringify({ alg: "ES256", kid, typ: "JWT" })));
      const payload = toBase64Url(encoder.encode(JSON.stringify(claims)));
      const encoded = `${header}.${payload}`;
      const signature = new Uint8Array(
        await crypto.subtle.sign(
          { name: "ECDSA", hash: "SHA-256" },
          keyPair.privateKey,
          encoder.encode(encoded),
        ),
      );

      return `${encoded}.${toBase64Url(signature)}`;
    };
    const requestUrl = (input: RequestInfo | URL): string => {
      if (typeof input === "string") {
        return input;
      }
      if (input instanceof Request) {
        return input.url;
      }

      return input.href;
    };
    const stubJwksFetch = () =>
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
          if (!requestUrl(input).endsWith("/jwks")) {
            throw new Error(`unexpected fetch: ${requestUrl(input)}`);
          }

          return Response.json(jwks);
        }),
      );
    const tamper = (token: string): string => {
      // Flip a character in the payload segment: unlike the signature's last
      // Character (whose low bits can be padding), any payload change breaks it.
      const segments = token.split(".");
      const payloadSegment = segments[1] ?? "";
      const first = payloadSegment[0] ?? "A";

      return [
        segments[0],
        `${first === "A" ? "B" : "A"}${payloadSegment.slice(1)}`,
        segments[2],
      ].join(".");
    };

    test("200: accepts a token issued for the api audience", async () => {
      // Arrange
      stubAuthFetch();
      const userId = crypto.randomUUID();
      const headers = await createBearerHeaders({ audience: apiAudience, userId });
      const project = await factories.projects
        .props({
          owner: () => userId,
          name: () => "bearer",
        })
        .create();

      // Act
      const response = await requestProjects(headers);
      const body = await response.json<{ projects: Project[] }>();

      // Assert
      expect(response.status).toBe(200);
      expect(body).toStrictEqual({ projects: [project] });
    });

    test("404: rejects a token issued for another audience", async () => {
      // Arrange
      stubAuthFetch();
      const headers = await createBearerHeaders({
        audience: "https://mcp.karibari.tsar-bmb.org/mcp",
        userId: crypto.randomUUID(),
      });

      // Act
      const response = await requestProjects(headers);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(body).toStrictEqual({ error: "not_found" });
    });

    test("404: rejects a tampered token", async () => {
      // Arrange
      stubAuthFetch();
      const headers = await createBearerHeaders({
        audience: apiAudience,
        userId: crypto.randomUUID(),
      });
      const token = tamper(headers.get("authorization")?.slice("Bearer ".length) ?? "");

      // Act
      const response = await requestProjects(bearerHeaders(token));
      const body = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(body).toStrictEqual({ error: "not_found" });
    });

    test("404: rejects an expired token", async () => {
      // Arrange
      stubJwksFetch();
      const expired = Math.floor(Date.now() / 1000) - 3600;
      const token = await mintBearer({
        iss: env.AUTH_BASE_URL,
        aud: apiAudience,
        sub: crypto.randomUUID(),
        exp: expired,
      });

      // Act
      const response = await requestProjects(bearerHeaders(token));
      const body = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(body).toStrictEqual({ error: "not_found" });
    });

    testWithAuth("200: prefers bearer over cookie", async ({ auth }) => {
      // Arrange
      const bearerUserId = crypto.randomUUID();
      const headers = await createBearerHeaders({ audience: apiAudience, userId: bearerUserId });
      await factories.projects
        .props({
          owner: () => auth.userId,
          name: () => "cookie-owned",
        })
        .create();
      const bearerProject = await factories.projects
        .props({
          owner: () => bearerUserId,
          name: () => "bearer-owned",
        })
        .create();
      headers.set("cookie", auth.headers.get("cookie") ?? "");

      // Act
      const response = await requestProjects(headers);
      const body = await response.json<{ projects: Project[] }>();

      // Assert
      expect(response.status).toBe(200);
      expect(body).toStrictEqual({ projects: [bearerProject] });
    });
  });
});
