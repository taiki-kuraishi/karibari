import { projects } from "@karibari/db";
import { eq as drizzleEq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../server";

import { nowSeconds } from "../../../factories/now-seconds";
import { validator } from "../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
});

const bodySchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.transform((value) => (value === "" ? null : value)),
  ),
});

export const patchProjectRoute = new Hono<HonoEnv>().patch(
  "",
  validator("param", paramSchema),
  validator("json", bodySchema),
  async (c) => {
    const { project_id: projectId } = c.req.valid("param");
    const { name } = c.req.valid("json");
    const owner = c.get("userId");
    const project = await c.env.db.query.projects.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) => and(eq(table.id, projectId), eq(table.owner, owner)),
    });

    if (!project) {
      return c.json({ error: "not_found" }, 404);
    }

    const updated = await c.env.db
      .update(projects)
      .set({ name, updated_at: nowSeconds() })
      .where(drizzleEq(projects.id, projectId))
      .returning()
      .get();

    return c.json({ project: updated });
  },
);
