import { Hono } from "hono";
import { describe, expect, test } from "vitest";

import type { HonoEnv } from "../src/middlewares/dependency-injection";

import { corsMiddleware } from "../src/middlewares/cors";
import { app } from "../src/server";

describe("CORS on /api/auth/*", () => {
  const viewerOrigin = "https://karibari.tsar-bmb.org";
  // Origins that must never be granted: another site, a host that only starts with the viewer's, the same host over http, an opaque origin (a sandboxed iframe), and the auth origin itself.
  const refusedOrigins = [
    "https://evil.example",
    `${viewerOrigin}.evil.example`,
    "http://karibari.tsar-bmb.org",
    "null",
    "https://auth.karibari.tsar-bmb.org",
  ];
  // Stands in for the better-auth handler, which needs a migrated D1 to answer.
  const getSessionApp = new Hono<HonoEnv>()
    .use("/api/auth/*", corsMiddleware)
    .get("/api/auth/get-session", (c) => c.json(null));

  test("lets the viewer origin read a credentialed response", async () => {
    // Arrange
    const init = { headers: { origin: viewerOrigin } };

    // Act
    const response = await getSessionApp.request("/api/auth/get-session", init);

    // Assert
    expect(response.headers.get("access-control-allow-origin")).toBe(viewerOrigin);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  test("answers a preflight from the viewer origin", async () => {
    // Arrange
    const init = {
      headers: { origin: viewerOrigin, "access-control-request-method": "GET" },
      method: "OPTIONS",
    };

    // Act
    const response = await getSessionApp.request("/api/auth/get-session", init);

    // Assert
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(viewerOrigin);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  test.each(refusedOrigins)("grants nothing to a response read from %s", async (origin) => {
    // Arrange
    const init = { headers: { origin } };

    // Act
    const response = await getSessionApp.request("/api/auth/get-session", init);

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  });

  test.each(refusedOrigins)("grants nothing to a preflight from %s", async (origin) => {
    // Arrange
    const init = {
      headers: { origin, "access-control-request-method": "GET" },
      method: "OPTIONS",
    };

    // Act
    const response = await getSessionApp.request("/api/auth/get-session", init);

    // Assert
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  });

  test("leaves a request without an Origin header untouched", async () => {
    // Arrange
    // No Origin header is sent.

    // Act
    const response = await getSessionApp.request("/api/auth/get-session");

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  });

  test("the server answers a viewer preflight before better-auth is built", async () => {
    // Arrange
    // An empty env makes the dependency injection middleware throw if the preflight ever reaches it.
    const init = {
      headers: { origin: viewerOrigin, "access-control-request-method": "GET" },
      method: "OPTIONS",
    };

    // Act
    const response = await app.request("/api/auth/get-session", init, {});

    // Assert
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(viewerOrigin);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });
});
