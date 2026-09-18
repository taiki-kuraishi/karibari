import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../server";

import { authenticateSessionMiddleware } from "../../../middlewares/authenticate-session";
import { validator } from "../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
});

export const getProject = new Hono<HonoEnv>().get(
  "",
  authenticateSessionMiddleware,
  validator("param", paramSchema),
  async (c) => {
    const { project_id: projectId } = c.req.valid("param");
    const owner = c.get("userId");
    const project = await c.env.db.query.projects.findFirst({
      where: (table, { and, eq }) => and(eq(table.id, projectId), eq(table.owner, owner)),
    });

    if (!project) {
      return c.json({ error: "not_found" }, 404);
    }

    return c.json({ project });
  },
);
