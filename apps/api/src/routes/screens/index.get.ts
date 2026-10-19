import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../server";

import { idsSchema } from "../../ids-query-schema";
import { validator } from "../../validator";

const querySchema = v.object({ version_id: idsSchema });

export const getScreensRoute = new Hono<HonoEnv>().get(
  "",
  validator("query", querySchema),
  async (c) => {
    const { version_id: versionIds } = c.req.valid("query");
    const owner = c.get("userId");
    const versions = await c.env.db.query.versions.findMany({
      columns: { id: true, project_id: true },
      where: (table, { inArray }) => inArray(table.id, versionIds),
    });
    // Versions the caller does not own are dropped, not rejected, so a foreign id reveals nothing.
    const projects = await c.env.db.query.projects.findMany({
      columns: { id: true },
      where: (table, { and, eq, inArray }) =>
        and(
          eq(table.owner, owner),
          inArray(
            table.id,
            versions.map((version) => version.project_id),
          ),
        ),
    });
    const ownedProjectIds = new Set(projects.map((project) => project.id));
    const ownedVersionIds = versions
      .filter((version) => ownedProjectIds.has(version.project_id))
      .map((version) => version.id);

    const screens = await c.env.db.query.screens.findMany({
      where: (table, { inArray }) => inArray(table.version_id, ownedVersionIds),
      // `rowid` follows insertion: SQLite gives a new row the largest live rowid plus one.
      orderBy: (_table, { asc, sql }) => [asc(sql`rowid`)],
    });

    return c.json({ screens });
  },
);
