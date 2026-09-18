import type { MiddlewareHandler } from "hono";

import { Result } from "better-result";

import type { HonoEnv } from "../server";

import { AuthUnavailableError } from "../errors/auth-unavailable-error";

export const authenticateSessionMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
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
