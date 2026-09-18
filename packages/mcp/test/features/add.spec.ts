import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createMcpServer } from "../../src/index";
import { connectClient } from "../helpers/client";

describe("add tool", () => {
  // oxlint-disable-next-line eslint/init-declarations -- Assigned in beforeAll.
  let server: McpServer;
  // oxlint-disable-next-line eslint/init-declarations -- Assigned in beforeAll.
  let client: Client;

  beforeAll(async () => {
    server = createMcpServer();
    client = await connectClient(server);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  it("returns the sum of two numbers as text", async () => {
    // Arrange

    // Act
    const res = await client.callTool({ arguments: { a: 2, b: 3 }, name: "add" });

    // Assert
    expect(res.isError).toBeFalsy();
    expect(res.content).toStrictEqual([{ text: "2 + 3 = 5", type: "text" }]);
  });

  it("registers the add tool", async () => {
    // Arrange

    // Act
    const { tools } = await client.listTools();

    // Assert
    expect(tools.map((tool) => tool.name)).toStrictEqual(["add"]);
  });
});
