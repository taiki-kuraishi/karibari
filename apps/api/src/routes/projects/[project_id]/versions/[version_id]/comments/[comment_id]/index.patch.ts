import { comments } from "@karibari/db";
import { eq as drizzleEq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../../../../../server";

import { nowSeconds } from "../../../../../../../factories/now-seconds";
import { validator } from "../../../../../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
  version_id: v.pipe(v.string(), v.nonEmpty()),
  comment_id: v.pipe(v.string(), v.nonEmpty()),
});

const bodySchema = v.object({
  body: v.pipe(v.string(), v.nonEmpty()),
});

export const patchProjectVersionCommentRoute = new Hono<HonoEnv>().patch(
  "",
  validator("param", paramSchema),
  validator("json", bodySchema),
  async (c) => {
    const {
      project_id: projectId,
      version_id: versionId,
      comment_id: commentId,
    } = c.req.valid("param");
    const { body } = c.req.valid("json");
    const owner = c.get("userId");
    const project = await c.env.db.query.projects.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) => and(eq(table.id, projectId), eq(table.owner, owner)),
    });

    if (!project) {
      return c.json({ error: "not_found" }, 404);
    }

    // Matching source keeps AI-written (mcp) comments read-only from the viewer.
    const comment = await c.env.db.query.comments.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) =>
        and(
          eq(table.id, commentId),
          eq(table.project_id, projectId),
          eq(table.version_id, versionId),
          eq(table.author, owner),
          eq(table.source, c.get("commentSource")),
        ),
    });

    if (!comment) {
      return c.json({ error: "not_found" }, 404);
    }

    const updated = await c.env.db
      .update(comments)
      .set({ body, updated_at: nowSeconds() })
      .where(drizzleEq(comments.id, commentId))
      .returning()
      .get();

    return c.json({ comment: updated });
  },
);
