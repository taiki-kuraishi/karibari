import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createMcpServer } from "../../src/index";
import { connectClient } from "../helpers/client";

describe("create_project tool", () => {
  const apiBaseUrl = "http://api";
  const token = "test-token";
  const created = { projectId: "p1", versionId: "v1", url: "/p/p1" };

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

  it("posts html to the api with the bearer token and returns the result as JSON", async () => {
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

        return Response.json(created, { status: 201 });
      }),
    );

    // Act
    const res = await client.callTool({
      arguments: { html: "<p>hi</p>", name: "demo" },
      name: "create_project",
    });

    // Assert
    expect(res.isError).toBeFalsy();
    expect(seen).toStrictEqual([
      {
        authorization: "Bearer test-token",
        body: { html: "<p>hi</p>", name: "demo" },
        method: "POST",
        url: "http://api/api/projects",
      },
    ]);
    expect(res.content).toStrictEqual([{ text: JSON.stringify(created), type: "text" }]);
  });

  it("reports an api failure as a tool error", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "not_found" }, { status: 404 })),
    );

    // Act
    const res = await client.callTool({
      arguments: { html: "<p>hi</p>" },
      name: "create_project",
    });

    // Assert
    expect(res.isError).toBe(true);
  });
});
