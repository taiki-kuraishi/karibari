import type { MetaDb } from "@karibari/db";

import { Hono } from "hono";

import type { ProjectFactory } from "./factories/project-factory";
import type { ApiAuthClient } from "./middlewares/inject-middleware";

import { injectMiddleware } from "./middlewares/inject-middleware";
import { getHealth } from "./routes/health/index.get";
import { getProject } from "./routes/projects/[project_id]/index.get";
import { getProjects } from "./routes/projects/index.get";
import { postProjects } from "./routes/projects/index.post";

export interface HonoEnv {
  Bindings: Cloudflare.Env & {
    authClient: ApiAuthClient;
    db: MetaDb;
    projectFactory: ProjectFactory;
  };
  Variables: { userId: string };
}

// Single method chain: breaking it loses Hono's RPC type inference.
export const app = new Hono<HonoEnv>()
  .use("/api/*", injectMiddleware)
  .route("/health", getHealth)
  .route("/api/projects/:project_id", getProject)
  .route("/api/projects", getProjects)
  .route("/api/projects", postProjects);
