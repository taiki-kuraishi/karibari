import { comments } from "@karibari/db";
import { eq as drizzleEq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../../../../../server";

import { validator } from "../../../../../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
  version_id: v.pipe(v.string(), v.nonEmpty()),
  comment_id: v.pipe(v.string(), v.nonEmpty()),
});

export const deleteProjectVersionCommentRoute = new Hono<HonoEnv>().delete(
  "",
  validator("param", paramSchema),
  async (c) => {
    const {
      project_id: projectId,
      version_id: versionId,
      comment_id: commentId,
    } = c.req.valid("param");
    const owner = c.get("userId");
    const project = await c.env.db.query.projects.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) => and(eq(table.id, projectId), eq(table.owner, owner)),
    });

    if (!project) {
      return c.json({ error: "not_found" }, 404);
    }

    const comment = await c.env.db.query.comments.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) =>
        and(
          eq(table.id, commentId),
          eq(table.project_id, projectId),
          eq(table.version_id, versionId),
        ),
    });

    if (!comment) {
      return c.json({ error: "not_found" }, 404);
    }

    // The self-referencing `ON DELETE cascade` removes the thread's replies.
    await c.env.db.delete(comments).where(drizzleEq(comments.id, commentId));

    return c.json({ deleted: true });
  },
);
