import type { MiddlewareHandler } from "hono";

import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { apiAudience, mcpAudience } from "@karibari/better-auth";
import { Result } from "better-result";

import type { HonoEnv } from "../server";

import { AuthUnavailableError } from "../errors/auth-unavailable-error";

export const authMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const authorization = c.req.header("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    const result = await Result.tryPromise({
      try: async () =>
        await oauthProviderResourceClient()
          .getActions()
          .verifyBearerToken(authorization.slice("Bearer ".length), {
            // MCP clients request only the MCP resource (RFC 8707) and remote-mcp relays that
            // Same token here, so MCP-only tokens must pass. Accepted knowingly: this is a
            // Single-user deployment, so the confused-deputy risk is tolerated. Planned: move
            // To token exchange (RFC 8693) and drop the MCP audience.
            verifyOptions: {
              audience: [apiAudience, mcpAudience],
              issuer: c.env.AUTH_BASE_URL,
            },
            jwksUrl: `${c.env.AUTH_BASE_URL}/jwks`,
          }),
      catch: (cause) => new AuthUnavailableError({ cause, message: "Bearer verification failed" }),
    });
    // Transport and token failures share one rejection: telling them apart needs
    // Jose error imports, so both fail closed here without distinction.
    if (result.isErr() || typeof result.value.sub !== "string") {
      return c.json({ error: "not_found" }, 404);
    }

    c.set("userId", result.value.sub);

    return next();
  }

  const cookie = c.req.header("Cookie");
  if (!cookie) {
    return c.json({ error: "not_found" }, 404);
  }

  const result = await Result.tryPromise({
    try: async () =>
      await c.env.authClient.getSession({
        query: { disableRefresh: true },
        fetchOptions: { headers: { cookie } },
      }),
    catch: (cause) => new AuthUnavailableError({ cause, message: "Auth session request failed" }),
  });
  if (result.isErr()) {
    console.log({ error: result.error, reason: "auth_unavailable" });

    return c.json({ error: "not_found" }, 404);
  }

  const { data, error } = result.value;
  if (error !== null || data === null) {
    return c.json({ error: "not_found" }, 404);
  }

  c.set("userId", data.user.id);

  return next();
};
