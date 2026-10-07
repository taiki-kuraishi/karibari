export interface McpContext {
  apiBaseUrl: string;
  token: string;
  userId: string;
  viewerOrigin: string;
}

// The MCP ingress verifies the access token (JWT + DPoP); only its raw token
// Travels further, as a plain Bearer over TLS to the API.
export const toMcpContext = (args: {
  request: Request;
  claims: { sub?: unknown };
  apiBaseUrl: string;
  viewerOrigin: string;
}): McpContext | null => {
  const token = args.request.headers.get("Authorization")?.split(" ", 2)[1];
  const userId = args.claims.sub;
  if (!token || typeof userId !== "string") {
    return null;
  }

  return { apiBaseUrl: args.apiBaseUrl, token, userId, viewerOrigin: args.viewerOrigin };
};
