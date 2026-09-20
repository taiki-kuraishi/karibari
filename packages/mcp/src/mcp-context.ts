export interface McpContext {
  apiBaseUrl: string;
  token: string;
  userId: string;
}

// The MCP ingress verifies the access token (JWT + DPoP); only its raw token
// Travels further, as a plain Bearer over TLS to the API.
export const toMcpContext = (
  request: Request,
  claims: { sub?: unknown },
  apiBaseUrl: string,
): McpContext | null => {
  const token = request.headers.get("Authorization")?.split(" ", 2)[1];
  const userId = claims.sub;
  if (!token || typeof userId !== "string") {
    return null;
  }

  return { apiBaseUrl, token, userId };
};
