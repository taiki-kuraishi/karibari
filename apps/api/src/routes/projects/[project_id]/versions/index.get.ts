import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../../server";

import { validator } from "../../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
});

export const getProjectVersionsRoute = new Hono<HonoEnv>().get(
  "",
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
      // Insertion order. `created_at` ties within a second and `id` is a random UUID.
      // `rowid` follows insertion because rows in this table are never deleted.
      orderBy: (_table, { asc, sql }) => [asc(sql`rowid`)],
    });

    return c.json({ versions });
  },
);
