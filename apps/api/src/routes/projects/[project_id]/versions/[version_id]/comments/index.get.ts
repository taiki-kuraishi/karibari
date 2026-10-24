import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../../../../server";

import { validator } from "../../../../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
  version_id: v.pipe(v.string(), v.nonEmpty()),
});

export const getProjectVersionCommentsRoute = new Hono<HonoEnv>().get(
  "",
  validator("param", paramSchema),
  async (c) => {
    const { project_id: projectId, version_id: versionId } = c.req.valid("param");
    const owner = c.get("userId");
    const project = await c.env.db.query.projects.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) => and(eq(table.id, projectId), eq(table.owner, owner)),
    });

    if (!project) {
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
