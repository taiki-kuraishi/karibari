import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createMcpServer } from "../../src/index";
import { connectClient } from "../helpers/client";

describe("get_screen_content tool", () => {
  // oxlint-disable-next-line eslint/init-declarations -- Assigned in beforeAll.
  let server: McpServer;
  // oxlint-disable-next-line eslint/init-declarations -- Assigned in beforeAll.
  let client: Client;

  beforeAll(async () => {
    server = createMcpServer({ apiBaseUrl: "http://api", token: "test-token", userId: "user-1" });
    client = await connectClient(server);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the selected screen's HTML unchanged with bearer authentication", async () => {
    // Arrange
    const html = "<!doctype html>\n<html><body><h1>Home 日本語</h1></body></html>\n";
    const seen: { url: string; authorization: string | null }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (typeof input !== "string") {
          throw new Error("expected a string URL");
        }
        seen.push({ url: input, authorization: new Headers(init?.headers).get("authorization") });
        return new Response(html, { headers: { "content-type": "text/html" } });
      }),
    );

    // Act
    const res = await client.callTool({
      name: "get_screen_content",
      arguments: { projectId: "p1", versionId: "v1", screenId: "s2" },
    });

    // Assert
    expect(res.isError).toBeFalsy();
    expect(res.content).toStrictEqual([{ type: "text", text: html }]);
    expect(seen).toStrictEqual([
      {
        url: "http://api/api/projects/p1/versions/v1/screens/s2/content",
        authorization: "Bearer test-token",
      },
    ]);
  });

  it("reports an API failure as a tool error", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "not_found" }, { status: 404 })),
    );

    // Act
    const res = await client.callTool({
      name: "get_screen_content",
      arguments: { projectId: "p1", versionId: "v1", screenId: "s2" },
    });

    // Assert
    expect(res.isError).toBe(true);
    expect(res.content).toStrictEqual([{ type: "text", text: "API responded with 404" }]);
  });
});
