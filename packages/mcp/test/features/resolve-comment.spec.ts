import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createMcpServer } from "../../src/index";
import { connectClient } from "../helpers/client";

describe("resolve_comment tool", () => {
  const apiBaseUrl = "http://api";
  const token = "test-token";
  const created = { comment: { id: "c1", resolved_at: 1 } };

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

  it("patches the thread resolution with the bearer token and returns the result as JSON", async () => {
    // Arrange
    const seen: { url: string; authorization: string | null; body: unknown; method?: string }[] =
      [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (typeof input !== "string") {
          throw new Error("expected a string URL");
        }
        const headers = new Headers(init?.headers);
        seen.push({
          authorization: headers.get("authorization"),
          body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : init?.body,
          method: init?.method,
          url: input,
        });

        return Response.json(created, { status: 200 });
      }),
    );

    // Act
    const res = await client.callTool({
      arguments: { commentId: "c1", projectId: "p1", resolved: true, versionId: "v1" },
      name: "resolve_comment",
    });

    // Assert
    expect(res.isError).toBeFalsy();
    expect(seen).toStrictEqual([
      {
        authorization: "Bearer test-token",
        body: { resolved: true },
        method: "PATCH",
        url: "http://api/api/projects/p1/versions/v1/comments/c1/resolution",
      },
    ]);
    expect(res.content).toStrictEqual([{ text: JSON.stringify(created), type: "text" }]);
  });

  it("reports a non-root comment (400) as a tool error", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "not_thread_root" }, { status: 400 })),
    );

    // Act
    const res = await client.callTool({
      arguments: { commentId: "r1", projectId: "p1", resolved: true, versionId: "v1" },
      name: "resolve_comment",
    });

    // Assert
    expect(res.isError).toBe(true);
  });
});
