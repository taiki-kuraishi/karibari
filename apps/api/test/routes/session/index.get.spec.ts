import { exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../helpers/auth-test";

describe("GET /api/session", () => {
  const sessionTest = authTest({ path: "/api/session", init: { method: "GET" } });

  sessionTest("200: returns the id of the user who owns the session", async ({ auth }) => {
    // Arrange
    const request = new Request("http://api/api/session", { headers: new Headers(auth.headers) });

    // Act
    const response = await exports.default.fetch(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ userId: auth.userId });
  });
});
