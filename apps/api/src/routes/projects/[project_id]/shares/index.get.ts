import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../../server";

import { validator } from "../../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
});

export const getProjectShares = new Hono<HonoEnv>().get(
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

    const shares = await c.env.db.query.shares.findMany({
      where: (table, { eq }) => eq(table.project_id, projectId),
      orderBy: (table, { asc }) => [asc(table.id)],
    });

    return c.json({ shares });
  },
);
