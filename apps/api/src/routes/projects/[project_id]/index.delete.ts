import { projects } from "@karibari/db";
import { eq as drizzleEq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../server";

import { projectHtmlPrefix } from "../../../screen-html-key";
import { validator } from "../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
});

export const deleteProjectRoute = new Hono<HonoEnv>().delete(
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

    // The schema's `ON DELETE cascade` removes the project's versions, screens, comments and shares.
    await c.env.db.delete(projects).where(drizzleEq(projects.id, projectId));

    // D1 before R2: a failed R2 delete only leaves objects nothing points to,
    // While R2-first would leave meta rows whose HTML is missing (r2_missing 404).
    // Each round deletes the first page, so the next list starts over instead of following a cursor.
    // oxlint-disable eslint/no-await-in-loop -- Each list must see the previous round's deletes.
    const prefix = projectHtmlPrefix(projectId);
    let { objects } = await c.env.HTML_BUCKET.list({ prefix });
    while (objects.length > 0) {
      await c.env.HTML_BUCKET.delete(objects.map((object) => object.key));
      ({ objects } = await c.env.HTML_BUCKET.list({ prefix }));
    }
    // oxlint-enable eslint/no-await-in-loop

    return c.json({ deleted: true });
  },
);
