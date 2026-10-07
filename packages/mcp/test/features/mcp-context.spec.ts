import { describe, expect, it } from "vitest";

import { toMcpContext } from "../../src/mcp-context";

describe("toMcpContext", () => {
  const apiBaseUrl = "http://api";
  const viewerOrigin = "http://viewer";
  const claims = { sub: "user-1" };

  it("builds a context from a DPoP-scheme authorization header", () => {
    // Arrange
    const request = new Request("http://mcp/mcp", {
      headers: { authorization: "DPoP access-token" },
    });

    // Act
    const context = toMcpContext(request, claims, apiBaseUrl, viewerOrigin);

    // Assert
    expect(context).toStrictEqual({
      apiBaseUrl,
      token: "access-token",
      userId: "user-1",
      viewerOrigin,
    });
  });

  it("builds a context from a Bearer-scheme authorization header", () => {
    // Arrange
    const request = new Request("http://mcp/mcp", {
      headers: { authorization: "Bearer access-token" },
    });

    // Act
    const context = toMcpContext(request, claims, apiBaseUrl, viewerOrigin);

    // Assert
    expect(context).toStrictEqual({
      apiBaseUrl,
      token: "access-token",
      userId: "user-1",
      viewerOrigin,
    });
  });

  it("returns null without an authorization header", () => {
    // Arrange
    const request = new Request("http://mcp/mcp");

    // Act
    const context = toMcpContext(request, claims, apiBaseUrl, viewerOrigin);

    // Assert
    expect(context).toBeNull();
  });

  it("returns null without a subject claim", () => {
    // Arrange
    const request = new Request("http://mcp/mcp", {
      headers: { authorization: "Bearer access-token" },
    });

    // Act
    const context = toMcpContext(request, {}, apiBaseUrl, viewerOrigin);

    // Assert
    expect(context).toBeNull();
  });
});
