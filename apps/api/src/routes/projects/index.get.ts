import { Hono } from "hono";

import type { HonoEnv } from "../../server";

export const getProjects = new Hono<HonoEnv>().get("", async (c) => {
  const owner = c.get("userId");
  const projects = await c.env.db.query.projects.findMany({
    where: (table, { eq }) => eq(table.owner, owner),
    orderBy: (table, { desc }) => [desc(table.updated_at), desc(table.id)],
  });

  return c.json({ projects });
});
