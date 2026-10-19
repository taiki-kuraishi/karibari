import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../server";

import { idsSchema } from "../../ids-query-schema";
import { validator } from "../../validator";

const querySchema = v.object({ project_id: idsSchema });

export const getCommentsRoute = new Hono<HonoEnv>().get(
  "",
  validator("query", querySchema),
  async (c) => {
    const { project_id: projectIds } = c.req.valid("query");
    const owner = c.get("userId");
    // Ids the caller does not own are dropped, not rejected, so a foreign id reveals nothing.
    const projects = await c.env.db.query.projects.findMany({
      columns: { id: true },
      where: (table, { and, eq, inArray }) =>
        and(eq(table.owner, owner), inArray(table.id, projectIds)),
    });

    const comments = await c.env.db.query.comments.findMany({
      where: (table, { inArray }) =>
        inArray(
          table.project_id,
          projects.map((project) => project.id),
        ),
      orderBy: (table, { asc }) => [asc(table.created_at), asc(table.id)],
    });

    return c.json({ comments });
  },
);
