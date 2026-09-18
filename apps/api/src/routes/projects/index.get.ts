import { Hono } from "hono";

import type { HonoEnv } from "../../server";

import { authenticateSessionMiddleware } from "../../middlewares/authenticate-session";

export const getProjects = new Hono<HonoEnv>().get("", authenticateSessionMiddleware, async (c) => {
  const owner = c.get("userId");
  const projects = await c.env.db.query.projects.findMany({
    where: (table, { eq }) => eq(table.owner, owner),
    orderBy: (table, { desc }) => [desc(table.updated_at), desc(table.id)],
  });

  return c.json({ projects });
});
