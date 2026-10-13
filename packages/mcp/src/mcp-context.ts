export interface McpContext {
  apiBaseUrl: string;
  // Issued by auth's RFC 8693 token exchange for the API audience. The MCP-audience token the
  // Client presented is never forwarded: the API only accepts tokens issued for it.
  token: string;
  userId: string;
}
