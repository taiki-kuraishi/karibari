import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { describe, expect, vi } from "vitest";

import type { HonoEnv } from "../../src/server";

import { authenticateSessionMiddleware } from "../../src/middlewares/authenticate-session";
import { injectMiddleware } from "../../src/middlewares/inject-middleware";
import { testWithAuth } from "../helpers/auth-test";

const app = new Hono<HonoEnv>()
  .use("/api/*", injectMiddleware)
  .use("/api/*", authenticateSessionMiddleware)
  .get("/api/probe", (c) => c.json({ userId: c.get("userId") }));
const requestProbe = async (headers?: Headers) =>
  await app.request("/api/probe", { headers }, { ...env });
const invalidAuthHeaders = (headers: Headers) => {
  const invalid = new Headers(headers);
  invalid.set("cookie", "better-auth.session_token=invalid-session");

  return invalid;
};

describe("authenticateSessionMiddleware", () => {
  testWithAuth("200: sets the user id before continuing", async ({ auth }) => {
    // Arrange
    const { headers } = auth;
    // Act
    const response = await requestProbe(headers);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ userId: auth.userId });
  });

  testWithAuth("404: rejects a missing session", async () => {
    // Arrange
    // No Cookie header is sent.
    // Act
    const response = await requestProbe();
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  testWithAuth("404: rejects an invalid session", async ({ auth }) => {
    // Arrange
    const headers = invalidAuthHeaders(auth.headers);
    // Act
    const response = await requestProbe(headers);
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
    const response = await requestProbe(auth.headers);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });
});
