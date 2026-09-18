import type { MiddlewareHandler } from "hono";

import { createMetaDb } from "@karibari/db";
import { createAuthClient } from "better-auth/client";

import type { HonoEnv } from "../server";

import { ProjectFactory } from "../factories/project-factory";

const createApiAuthClient = (baseURL: string) =>
  createAuthClient({
    baseURL,
    fetchOptions: { customFetchImpl: async (input, init) => fetch(input, init) },
  });

export type ApiAuthClient = ReturnType<typeof createApiAuthClient>;

export const injectMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  Object.assign(c.env, {
    authClient: c.env.authClient ?? createApiAuthClient(c.env.AUTH_BASE_URL),
    db: c.env.db ?? createMetaDb(c.env.DB),
    projectFactory: c.env.projectFactory ?? new ProjectFactory(),
  });

  return next();
};
