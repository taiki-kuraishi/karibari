import type { MiddlewareHandler } from "hono";

import { createAuthDatabase, createBetterAuth } from "@karibari/better-auth";

export interface HonoEnv {
  Bindings: Cloudflare.Env & {
    auth: ReturnType<typeof createBetterAuth>;
  };
}

export const injectDependenciesMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const auth = createBetterAuth({
    // `better-auth` 1.7.3 takes the router prefix from `baseURL`'s resolved pathname.
    // An empty `basePath` therefore leaves every route at "/" and the `/api/auth/*` mount 404s.
    basePath: "/api/auth",
    baseURL: c.env.BETTER_AUTH_URL,
    database: createAuthDatabase(c.env.DB),
    secret: await c.env.BETTER_AUTH_SECRET.get(),
    // GitHub OAuth credentials come from Secrets Store (see wrangler.jsonc).
    socialProviders: {
      github: {
        clientId: await c.env.GITHUB_CLIENT_ID.get(),
        clientSecret: await c.env.GITHUB_CLIENT_SECRET.get(),
      },
    },
  });
  Object.assign(c.env, { auth });

  return next();
};
