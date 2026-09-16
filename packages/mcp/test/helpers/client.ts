import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

export const connectClient = async (server: McpServer): Promise<Client> => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair(),
    client = new Client({ name: "test client", version: "0.0.0" });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return client;
};
