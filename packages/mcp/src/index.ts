import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";

import { AddTool } from "./tools";

export const createMcpServer = (): McpServer => {
  const server = new McpServer(
    { name: "karibari", version: "0.0.0" },
    { jsonSchemaValidator: new AjvJsonSchemaValidator() },
  );

  new AddTool().register(server);

  return server;
};
