import type { MetaDb } from "@karibari/db";

import { Hono } from "hono";

import type { CommentFactory } from "./factories/comment-factory";
import type { ProjectFactory } from "./factories/project-factory";
import type { VersionFactory } from "./factories/version-factory";
import type { ApiAuthClient } from "./middlewares/inject-middleware";

import { authMiddleware } from "./middlewares/auth";
import { corsMiddleware } from "./middlewares/cors";
import { injectMiddleware } from "./middlewares/inject-middleware";
import { getHealthRoute } from "./routes/health/index.get";
import { getProjectCommentsRoute } from "./routes/projects/[project_id]/comments/index.get";
import { postProjectCommentsRoute } from "./routes/projects/[project_id]/comments/index.post";
import { getProjectRoute } from "./routes/projects/[project_id]/index.get";
import { deleteProjectShareRoute } from "./routes/projects/[project_id]/shares/[share_id]/index.delete";
import { getProjectSharesRoute } from "./routes/projects/[project_id]/shares/index.get";
import { getProjectVersionContentRoute } from "./routes/projects/[project_id]/versions/[version_id]/content.get";
import { getProjectVersionRoute } from "./routes/projects/[project_id]/versions/[version_id]/index.get";
import { getProjectVersionsRoute } from "./routes/projects/[project_id]/versions/index.get";
import { postProjectVersionsRoute } from "./routes/projects/[project_id]/versions/index.post";
import { getProjectsRoute } from "./routes/projects/index.get";
import { postProjectsRoute } from "./routes/projects/index.post";

export interface HonoEnv {
  Bindings: Cloudflare.Env & {
    authClient: ApiAuthClient;
    commentFactory: CommentFactory;
    db: MetaDb;
    projectFactory: ProjectFactory;
    versionFactory: VersionFactory;
  };
  Variables: { userId: string };
}

// Single method chain: breaking it loses Hono's RPC type inference.
export const app = new Hono<HonoEnv>()
  .route("/health", getHealthRoute)
  .use("/api/*", corsMiddleware)
  .use("/api/*", injectMiddleware)
  .use("/api/*", authMiddleware)
  .route("/api/projects/:project_id", getProjectRoute)
  .route("/api/projects/:project_id/comments", postProjectCommentsRoute)
  .route("/api/projects/:project_id/comments", getProjectCommentsRoute)
  .route("/api/projects/:project_id/shares", getProjectSharesRoute)
  .route("/api/projects/:project_id/shares/:share_id", deleteProjectShareRoute)
  .route("/api/projects/:project_id/versions", postProjectVersionsRoute)
  .route("/api/projects/:project_id/versions", getProjectVersionsRoute)
  .route("/api/projects/:project_id/versions/:version_id", getProjectVersionRoute)
  .route("/api/projects/:project_id/versions/:version_id/content", getProjectVersionContentRoute)
  .route("/api/projects", getProjectsRoute)
  .route("/api/projects", postProjectsRoute);
