import type { MetaDb } from "@karibari/db";

import { Hono } from "hono";

import type { CommentFactory } from "./factories/comment-factory";
import type { ProjectFactory } from "./factories/project-factory";
import type { ScreenFactory } from "./factories/screen-factory";
import type { VersionFactory } from "./factories/version-factory";
import type { ApiAuthClient } from "./middlewares/inject-middleware";

import { authMiddleware } from "./middlewares/auth";
import { corsMiddleware } from "./middlewares/cors";
import { injectMiddleware } from "./middlewares/inject-middleware";
import { getCommentsRoute } from "./routes/comments/index.get";
import { getHealthRoute } from "./routes/health/index.get";
import { deleteProjectRoute } from "./routes/projects/[project_id]/index.delete";
import { getProjectRoute } from "./routes/projects/[project_id]/index.get";
import { patchProjectRoute } from "./routes/projects/[project_id]/index.patch";
import { deleteProjectShareRoute } from "./routes/projects/[project_id]/shares/[share_id]/index.delete";
import { getProjectSharesRoute } from "./routes/projects/[project_id]/shares/index.get";
import { getProjectVersionCommentsRoute } from "./routes/projects/[project_id]/versions/[version_id]/comments/index.get";
import { postProjectVersionCommentsRoute } from "./routes/projects/[project_id]/versions/[version_id]/comments/index.post";
import { getProjectVersionRoute } from "./routes/projects/[project_id]/versions/[version_id]/index.get";
import { getProjectVersionScreenContentRoute } from "./routes/projects/[project_id]/versions/[version_id]/screens/[screen_id]/content.get";
import { getProjectVersionScreensRoute } from "./routes/projects/[project_id]/versions/[version_id]/screens/index.get";
import { getProjectVersionsRoute } from "./routes/projects/[project_id]/versions/index.get";
import { postProjectVersionsRoute } from "./routes/projects/[project_id]/versions/index.post";
import { getProjectsRoute } from "./routes/projects/index.get";
import { postProjectsRoute } from "./routes/projects/index.post";
import { getScreensRoute } from "./routes/screens/index.get";
import { getSharesRoute } from "./routes/shares/index.get";
import { getVersionsRoute } from "./routes/versions/index.get";

export interface HonoEnv {
  Bindings: Cloudflare.Env & {
    authClient: ApiAuthClient;
    commentFactory: CommentFactory;
    db: MetaDb;
    projectFactory: ProjectFactory;
    screenFactory: ScreenFactory;
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
  .route("/api/projects/:project_id", patchProjectRoute)
  .route("/api/projects/:project_id", deleteProjectRoute)
  .route("/api/projects/:project_id/shares", getProjectSharesRoute)
  .route("/api/projects/:project_id/shares/:share_id", deleteProjectShareRoute)
  .route("/api/projects/:project_id/versions", postProjectVersionsRoute)
  .route("/api/projects/:project_id/versions", getProjectVersionsRoute)
  .route("/api/projects/:project_id/versions/:version_id", getProjectVersionRoute)
  .route("/api/projects/:project_id/versions/:version_id/comments", postProjectVersionCommentsRoute)
  .route("/api/projects/:project_id/versions/:version_id/comments", getProjectVersionCommentsRoute)
  .route("/api/projects/:project_id/versions/:version_id/screens", getProjectVersionScreensRoute)
  .route(
    "/api/projects/:project_id/versions/:version_id/screens/:screen_id/content",
    getProjectVersionScreenContentRoute,
  )
  .route("/api/projects", getProjectsRoute)
  .route("/api/projects", postProjectsRoute)
  .route("/api/versions", getVersionsRoute)
  .route("/api/screens", getScreensRoute)
  .route("/api/comments", getCommentsRoute)
  .route("/api/shares", getSharesRoute);
