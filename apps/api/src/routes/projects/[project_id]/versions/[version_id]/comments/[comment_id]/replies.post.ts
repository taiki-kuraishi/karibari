import { comments } from "@karibari/db";
import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../../../../../server";

import { validator } from "../../../../../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
  version_id: v.pipe(v.string(), v.nonEmpty()),
  comment_id: v.pipe(v.string(), v.nonEmpty()),
});

const bodySchema = v.object({
  body: v.pipe(v.string(), v.nonEmpty()),
});

export const postProjectVersionCommentRepliesRoute = new Hono<HonoEnv>().post(
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

    const parent = await c.env.db.query.comments.findFirst({
      columns: { parent_id: true, screen_id: true, target: true },
      where: (table, { and, eq }) =>
        and(
          eq(table.id, commentId),
          eq(table.project_id, projectId),
          eq(table.version_id, versionId),
        ),
    });

    if (!parent) {
      return c.json({ error: "not_found" }, 404);
    }

    // Threads are one level deep, so replies attach only to a thread's first comment.
    if (parent.parent_id !== null) {
      return c.json({ error: "not_thread_root" }, 400);
    }

    const comment = c.env.commentFactory.create({
      projectId,
      versionId,
      parentId: commentId,
      screenId: parent.screen_id,
      author: owner,
      source: c.get("commentSource"),
      target: parent.target,
      body,
    });
    await c.env.db.insert(comments).values(comment);

    return c.json({ commentId: comment.id }, 201);
  },
);
