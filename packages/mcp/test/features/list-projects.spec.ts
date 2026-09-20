import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createMcpServer } from "../../src/index";
import { connectClient } from "../helpers/client";

describe("list_projects tool", () => {
  const apiBaseUrl = "http://api";
  const token = "test-token";
  const projects = [{ id: "p1", name: "demo", owner: "user-1", created_at: 100, updated_at: 100 }];

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

  it("calls the api with the bearer token and returns projects as JSON", async () => {
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

        return Response.json({ projects });
      }),
    );

    // Act
    const res = await client.callTool({ arguments: {}, name: "list_projects" });

    // Assert
    expect(res.isError).toBeFalsy();
    expect(seen).toStrictEqual([
      { url: "http://api/api/projects", authorization: "Bearer test-token" },
    ]);
    expect(res.content).toStrictEqual([{ text: JSON.stringify({ projects }), type: "text" }]);
  });

  it("reports an api failure as a tool error", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "not_found" }, { status: 404 })),
    );

    // Act
    const res = await client.callTool({ arguments: {}, name: "list_projects" });

    // Assert
    expect(res.isError).toBe(true);
  });

  it("registers the list_projects tool", async () => {
    // Arrange

    // Act
    const { tools } = await client.listTools();

    // Assert
    expect(tools.map((tool) => tool.name)).toStrictEqual([
      "add",
      "create_project",
      "add_version",
      "save_comment",
      "list_comments",
      "get_project_url",
      "list_projects",
    ]);
  });
});
