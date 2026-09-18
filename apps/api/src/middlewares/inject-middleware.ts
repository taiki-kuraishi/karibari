import type { MiddlewareHandler } from "hono";

import { createMetaDb } from "@karibari/db";
import { createAuthClient } from "better-auth/client";

import type { HonoEnv } from "../server";

import { CommentFactory } from "../factories/comment-factory";
import { ProjectFactory } from "../factories/project-factory";
import { VersionFactory } from "../factories/version-factory";

const createApiAuthClient = (baseURL: string) =>
  createAuthClient({
    baseURL,
    fetchOptions: { customFetchImpl: async (input, init) => fetch(input, init) },
  });

export type ApiAuthClient = ReturnType<typeof createApiAuthClient>;

export const injectMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  Object.assign(c.env, {
    authClient: c.env.authClient ?? createApiAuthClient(c.env.AUTH_BASE_URL),
    commentFactory: c.env.commentFactory ?? new CommentFactory(),
    db: c.env.db ?? createMetaDb(c.env.DB),
    projectFactory: c.env.projectFactory ?? new ProjectFactory(),
    versionFactory: c.env.versionFactory ?? new VersionFactory(),
  });

  return next();
};
