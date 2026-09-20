import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";

import type { McpContext } from "./mcp-context";

import { AddTool, ListProjectsTool } from "./tools";

export type { McpContext } from "./mcp-context";
export { toMcpContext } from "./mcp-context";

export const createMcpServer = (context: McpContext): McpServer => {
  const server = new McpServer(
    { name: "karibari", version: "0.0.0" },
    { jsonSchemaValidator: new AjvJsonSchemaValidator() },
  );

  new AddTool().register(server);
  new ListProjectsTool(context).register(server);

  return server;
};
