import { shares } from "@karibari/db";
import { and as drizzleAnd, eq as drizzleEq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../../../server";

import { authenticateSessionMiddleware } from "../../../../../middlewares/authenticate-session";
import { validator } from "../../../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
  share_id: v.pipe(v.string(), v.nonEmpty()),
});

export const deleteProjectShare = new Hono<HonoEnv>().delete(
  "",
  authenticateSessionMiddleware,
  validator("param", paramSchema),
  async (c) => {
    const { project_id: projectId, share_id: shareId } = c.req.valid("param");
    const owner = c.get("userId");
    const project = await c.env.db.query.projects.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) => and(eq(table.id, projectId), eq(table.owner, owner)),
    });

    if (!project) {
      return c.json({ error: "not_found" }, 404);
    }

    const share = await c.env.db.query.shares.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) => and(eq(table.id, shareId), eq(table.project_id, projectId)),
    });

    if (!share) {
      return c.json({ error: "not_found" }, 404);
    }

    await c.env.db
      .delete(shares)
      .where(drizzleAnd(drizzleEq(shares.id, shareId), drizzleEq(shares.project_id, projectId)));

    return c.json({ deleted: true });
  },
);
