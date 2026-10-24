import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createMcpServer } from "../../src/index";
import { connectClient } from "../helpers/client";

describe("list_versions tool", () => {
  const apiBaseUrl = "http://api";
  const token = "test-token";
  const versions = [
    { id: "v1", project_id: "p1", type: "canvas", created_at: 100 },
    { id: "v2", project_id: "p1", type: "full", created_at: 200 },
  ];

  // oxlint-disable-next-line eslint/init-declarations -- Assigned in beforeAll.
  let server: McpServer;
  // oxlint-disable-next-line eslint/init-declarations -- Assigned in beforeAll.
  let client: Client;

  beforeAll(async () => {
    server = createMcpServer({ apiBaseUrl, token, userId: "user-1" });
    client = await connectClient(server);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the api with the bearer token and returns versions as JSON", async () => {
    // Arrange
    const seen: { url: string; authorization: string | null }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (typeof input !== "string") {
          throw new Error("expected a string URL");
        }
        const headers = new Headers(init?.headers);
        seen.push({ url: input, authorization: headers.get("authorization") });

        return Response.json({ versions });
      }),
    );

    // Act
    const res = await client.callTool({ arguments: { projectId: "p1" }, name: "list_versions" });

    // Assert
    expect(res.isError).toBeFalsy();
    expect(seen).toStrictEqual([
      { url: "http://api/api/projects/p1/versions", authorization: "Bearer test-token" },
    ]);
    expect(res.content).toStrictEqual([{ text: JSON.stringify({ versions }), type: "text" }]);
  });

  it("reports an api failure as a tool error", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "not_found" }, { status: 404 })),
    );

    // Act
    const res = await client.callTool({
      arguments: { projectId: "missing" },
      name: "list_versions",
    });

    // Assert
    expect(res.isError).toBe(true);
  });
});
