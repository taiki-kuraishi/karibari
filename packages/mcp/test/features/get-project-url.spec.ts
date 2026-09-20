import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createMcpServer } from "../../src/index";
import { connectClient } from "../helpers/client";

describe("get_project_url tool", () => {
  const apiBaseUrl = "http://api";
  const token = "test-token";
  const project = { id: "p1", name: "demo", owner: "user-1" };
  const shares = [{ id: "s1", kind: "private", project_id: "p1" }];

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

  it("builds a version URL from the project and shares state without invite or signed params", async () => {
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

        if (input === "http://api/api/projects/p1") {
          return Response.json({ project });
        }

        return Response.json({ shares });
      }),
    );

    // Act
    const res = await client.callTool({
      arguments: { projectId: "p1", versionId: "v1" },
      name: "get_project_url",
    });

    // Assert
    expect(res.isError).toBeFalsy();
    expect(seen).toStrictEqual([
      { authorization: "Bearer test-token", url: "http://api/api/projects/p1" },
      { authorization: "Bearer test-token", url: "http://api/api/projects/p1/shares" },
    ]);
    expect(res.content).toStrictEqual([
      {
        text: JSON.stringify({
          projectId: "p1",
          shareCount: 1,
          url: "/p/p1?v=v1",
          versionId: "v1",
        }),
        type: "text",
      },
    ]);
  });

  it("omits the version query for the latest version URL", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (typeof input !== "string") {
          throw new Error("expected a string URL");
        }
        if (input.endsWith("/shares")) {
          return Response.json({ shares: [] });
        }

        return Response.json({ project });
      }),
    );

    // Act
    const res = await client.callTool({ arguments: { projectId: "p1" }, name: "get_project_url" });

    // Assert
    expect(res.isError).toBeFalsy();
    expect(res.content).toStrictEqual([
      { text: JSON.stringify({ projectId: "p1", shareCount: 0, url: "/p/p1" }), type: "text" },
    ]);
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
      name: "get_project_url",
    });

    // Assert
    expect(res.isError).toBe(true);
  });
});
