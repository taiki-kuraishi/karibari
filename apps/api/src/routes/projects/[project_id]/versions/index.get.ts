import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../../server";

import { authenticateSessionMiddleware } from "../../../../middlewares/authenticate-session";
import { validator } from "../../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
});

export const getProjectVersions = new Hono<HonoEnv>().get(
  "",
  authenticateSessionMiddleware,
  validator("param", paramSchema),
  async (c) => {
    const { project_id: projectId } = c.req.valid("param");
    const owner = c.get("userId");
    const project = await c.env.db.query.projects.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) => and(eq(table.id, projectId), eq(table.owner, owner)),
    });

    if (!project) {
      return c.json({ error: "not_found" }, 404);
    }

    const versions = await c.env.db.query.versions.findMany({
      where: (table, { eq }) => eq(table.project_id, projectId),
      orderBy: (table, { asc }) => [asc(table.created_at), asc(table.id)],
    });

    return c.json({ versions });
  },
);
