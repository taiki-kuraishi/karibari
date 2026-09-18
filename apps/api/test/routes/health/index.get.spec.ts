import { exports } from "cloudflare:workers";
import { describe, expect, test } from "vitest";

describe("GET /health", () => {
  test("200: returns a fixed liveness body", async () => {
    // Arrange
    const request = new Request("http://api/health");
    // Act
    const response = await exports.default.fetch(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ message: "ok" });
  });

  test("404: rejects anything else", async () => {
    // Arrange
    const request = new Request("http://api/");
    // Act
    const response = await exports.default.fetch(request);

    // Assert
    expect(response.status).toBe(404);
  });
});
