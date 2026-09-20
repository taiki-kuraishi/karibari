import type { MiddlewareHandler } from "hono";

import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { apiAudience } from "@karibari/better-auth";
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
            verifyOptions: { audience: apiAudience, issuer: c.env.AUTH_BASE_URL },
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
