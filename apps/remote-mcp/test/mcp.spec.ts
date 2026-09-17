import { exports } from "cloudflare:workers";
import { expect, test } from "vitest";

test("POST /mcp without a bearer token is 401 with a WWW-Authenticate challenge", async () => {
  // Arrange

  // Act
  const response = await exports.default.fetch(
    new Request("http://remote-mcp/mcp", { method: "POST" }),
  );

  // Assert
  expect(response.status).toBe(401);
  expect(response.headers.get("WWW-Authenticate")).toContain("Bearer");
});
