import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createMcpServer } from "../../src/index";
import { connectClient } from "../helpers/client";

describe("list_comments tool", () => {
  const apiBaseUrl = "http://api";
  const token = "test-token";
  const payload = {
    comments: [{ body: "nice", id: "c1", project_id: "p1", target: "#a", version_id: "v1" }],
  };

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

  it("gets comments for a version with the bearer token and returns them as JSON", async () => {
    // Arrange
    const seen: { url: string; authorization: string | null }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (typeof input !== "string") {
          throw new Error("expected a string URL");
        }
        const headers = new Headers(init?.headers);
        seen.push({ authorization: headers.get("authorization"), url: input });

        return Response.json(payload);
      }),
    );

    // Act
    const res = await client.callTool({
      arguments: { projectId: "p1", versionId: "v1" },
      name: "list_comments",
    });

    // Assert
    expect(res.isError).toBeFalsy();
    expect(seen).toStrictEqual([
      { authorization: "Bearer test-token", url: "http://api/api/projects/p1/comments?v=v1" },
    ]);
    expect(res.content).toStrictEqual([{ text: JSON.stringify(payload), type: "text" }]);
  });

  it("omits the version query for the latest version", async () => {
    // Arrange
    const seen: { url: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (typeof input !== "string") {
          throw new Error("expected a string URL");
        }
        seen.push({ url: input });

        return Response.json(payload);
      }),
    );

    // Act
    const res = await client.callTool({ arguments: { projectId: "p1" }, name: "list_comments" });

    // Assert
    expect(res.isError).toBeFalsy();
    expect(seen).toStrictEqual([{ url: "http://api/api/projects/p1/comments" }]);
  });

  it("reports an api failure as a tool error", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "not_found" }, { status: 404 })),
    );

    // Act
    const res = await client.callTool({
      arguments: { projectId: "missing", versionId: "v1" },
      name: "list_comments",
    });

    // Assert
    expect(res.isError).toBe(true);
  });
});
