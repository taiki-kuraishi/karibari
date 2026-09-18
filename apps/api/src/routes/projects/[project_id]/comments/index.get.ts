import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../../server";

import { authenticateSessionMiddleware } from "../../../../middlewares/authenticate-session";
import { validator } from "../../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
});

const querySchema = v.object({
  v: v.optional(v.string()),
});

export const getProjectComments = new Hono<HonoEnv>().get(
  "",
  authenticateSessionMiddleware,
  validator("param", paramSchema),
  validator("query", querySchema),
  async (c) => {
    const { project_id: projectId } = c.req.valid("param");
    const { v: queryVersionId } = c.req.valid("query");
    const owner = c.get("userId");
    const project = await c.env.db.query.projects.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) => and(eq(table.id, projectId), eq(table.owner, owner)),
    });

    if (!project) {
      return c.json({ error: "not_found" }, 404);
    }

    let versionId = queryVersionId;
    if (!versionId) {
      const latest = await c.env.db.query.versions.findFirst({
        columns: { id: true },
        where: (table, { eq }) => eq(table.project_id, projectId),
        orderBy: (table, { desc }) => [desc(table.created_at), desc(table.id)],
      });
      versionId = latest?.id;
    }

    if (!versionId) {
      return c.json({ error: "not_found" }, 404);
    }

    const version = await c.env.db.query.versions.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) => and(eq(table.id, versionId), eq(table.project_id, projectId)),
    });

    if (!version) {
      return c.json({ error: "not_found" }, 404);
    }

    const comments = await c.env.db.query.comments.findMany({
      where: (table, { and, eq }) =>
        and(eq(table.project_id, projectId), eq(table.version_id, versionId)),
      orderBy: (table, { asc }) => [asc(table.created_at), asc(table.id)],
    });

    return c.json({ comments });
  },
);
