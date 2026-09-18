import type { MetaDb } from "@karibari/db";

import { Hono } from "hono";

import type { CommentFactory } from "./factories/comment-factory";
import type { ProjectFactory } from "./factories/project-factory";
import type { VersionFactory } from "./factories/version-factory";
import type { ApiAuthClient } from "./middlewares/inject-middleware";

import { injectMiddleware } from "./middlewares/inject-middleware";
import { getHealth } from "./routes/health/index.get";
import { getProjectComments } from "./routes/projects/[project_id]/comments/index.get";
import { postProjectComments } from "./routes/projects/[project_id]/comments/index.post";
import { getProject } from "./routes/projects/[project_id]/index.get";
import { deleteProjectShare } from "./routes/projects/[project_id]/shares/[share_id]/index.delete";
import { getProjectShares } from "./routes/projects/[project_id]/shares/index.get";
import { getProjectVersionContent } from "./routes/projects/[project_id]/versions/[version_id]/content.get";
import { getProjectVersion } from "./routes/projects/[project_id]/versions/[version_id]/index.get";
import { getProjectVersions } from "./routes/projects/[project_id]/versions/index.get";
import { postProjectVersions } from "./routes/projects/[project_id]/versions/index.post";
import { getProjects } from "./routes/projects/index.get";
import { postProjects } from "./routes/projects/index.post";

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
  .use("/api/*", injectMiddleware)
  .route("/health", getHealth)
  .route("/api/projects/:project_id", getProject)
  .route("/api/projects/:project_id/comments", postProjectComments)
  .route("/api/projects/:project_id/comments", getProjectComments)
  .route("/api/projects/:project_id/shares", getProjectShares)
  .route("/api/projects/:project_id/shares/:share_id", deleteProjectShare)
  .route("/api/projects/:project_id/versions", postProjectVersions)
  .route("/api/projects/:project_id/versions", getProjectVersions)
  .route("/api/projects/:project_id/versions/:version_id", getProjectVersion)
  .route("/api/projects/:project_id/versions/:version_id/content", getProjectVersionContent)
  .route("/api/projects", getProjects)
  .route("/api/projects", postProjects);
