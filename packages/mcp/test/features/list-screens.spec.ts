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

  it.each([
    { versionId: undefined, expectedId: "v-first", expectedType: "full" },
    { versionId: "v-last", expectedId: "v-last", expectedType: "canvas" },
  ])("returns screen metadata for $expectedId", async (scenario) => {
    // Arrange
    const versions = [
      { id: "v-last", project_id: "p1", type: "canvas", created_at: 100 },
      { id: "v-first", project_id: "p1", type: "full", created_at: 100 },
    ];
    const screens = [{ id: "s1", name: "Home", width: 1280, height: 720 }];
    const seen: { url: string; authorization: string | null }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (typeof input !== "string") {
          throw new Error("expected a string URL");
        }
        seen.push({ url: input, authorization: new Headers(init?.headers).get("authorization") });

        if (input === "http://api/api/projects/p1/versions") {
          return Response.json({ versions });
        }
        return Response.json({ screens });
      }),
    );

    // Act
    const res = await client.callTool({
      name: "list_screens",
      arguments: { projectId: "p1", versionId: scenario.versionId },
    });

    // Assert
    expect(res.isError).toBeFalsy();
    expect(res.content).toStrictEqual([
      {
        type: "text",
        text: JSON.stringify({
          versionId: scenario.expectedId,
          type: scenario.expectedType,
          screens,
        }),
      },
    ]);
    expect(seen).toStrictEqual([
      { url: "http://api/api/projects/p1/versions", authorization: "Bearer test-token" },
      {
        url: `http://api/api/projects/p1/versions/${scenario.expectedId}/screens`,
        authorization: "Bearer test-token",
      },
    ]);
  });

  it.each(["versions", "screens"])("reports a %s API failure as a tool error", async (endpoint) => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (endpoint === "screens" && input.endsWith("/versions")) {
          return Response.json({ versions: [{ id: "v1", type: "canvas" }] });
        }
        return Response.json({ error: "not_found" }, { status: 404 });
      }),
    );

    // Act
    const res = await client.callTool({ name: "list_screens", arguments: { projectId: "p1" } });

    // Assert
    expect(res.isError).toBe(true);
    expect(res.content).toStrictEqual([{ type: "text", text: "API responded with 404" }]);
  });

  it.each([
    { versions: [], versionId: undefined },
    { versions: [{ id: "v1", type: "canvas" }], versionId: "missing" },
  ])("reports a missing target version as a tool error: $versionId", async (scenario) => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ versions: scenario.versions })),
    );

    // Act
    const res = await client.callTool({
      name: "list_screens",
      arguments: { projectId: "p1", versionId: scenario.versionId },
    });

    // Assert
    expect(res.isError).toBe(true);
    expect(res.content).toStrictEqual([{ type: "text", text: "Version not found" }]);
  });
});
