import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createMcpServer } from "../../src/index";
import { connectClient } from "../helpers/client";

describe("list_screens tool", () => {
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

  it("returns the version's screen metadata with the bearer token", async () => {
    // Arrange
    const screens = [{ id: "s1", name: "Home", width: 1280, height: 720 }];
    const seen: { url: string; authorization: string | null }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (typeof input !== "string") {
          throw new Error("expected a string URL");
        }
        seen.push({ url: input, authorization: new Headers(init?.headers).get("authorization") });

        return Response.json({ screens });
      }),
    );

    // Act
    const res = await client.callTool({
      name: "list_screens",
      arguments: { projectId: "p1", versionId: "v1" },
    });

    // Assert
    expect(res.isError).toBeFalsy();
    expect(res.content).toStrictEqual([{ type: "text", text: JSON.stringify({ screens }) }]);
    expect(seen).toStrictEqual([
      {
        url: "http://api/api/projects/p1/versions/v1/screens",
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
      name: "list_screens",
      arguments: { projectId: "p1", versionId: "missing" },
    });

    // Assert
    expect(res.isError).toBe(true);
    expect(res.content).toStrictEqual([{ type: "text", text: "API responded with 404" }]);
  });
});
