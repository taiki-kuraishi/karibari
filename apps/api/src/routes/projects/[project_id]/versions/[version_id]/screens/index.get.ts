import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../../../../server";

import { validator } from "../../../../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
  version_id: v.pipe(v.string(), v.nonEmpty()),
});

export const getProjectVersionScreensRoute = new Hono<HonoEnv>().get(
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

    const screens = await c.env.db.query.screens.findMany({
      columns: { id: true, name: true, width: true, height: true },
      where: (table, { eq }) => eq(table.version_id, versionId),
      // Submission order, which a version's screens have no column for.
      // `rowid` follows insertion: SQLite gives a new row the largest live rowid plus one.
      orderBy: (_table, { asc, sql }) => [asc(sql`rowid`)],
    });

    return c.json({ screens });
  },
);
