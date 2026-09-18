import { comments } from "@karibari/db";
import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../../server";

import { authenticateSessionMiddleware } from "../../../../middlewares/authenticate-session";
import { validator } from "../../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
});

const bodySchema = v.object({
  versionId: v.pipe(v.string(), v.nonEmpty()),
  target: v.pipe(v.string(), v.nonEmpty()),
  body: v.pipe(v.string(), v.nonEmpty()),
});

export const postProjectComments = new Hono<HonoEnv>().post(
  "",
  authenticateSessionMiddleware,
  validator("param", paramSchema),
  validator("json", bodySchema),
  async (c) => {
    const { project_id: projectId } = c.req.valid("param");
    const { versionId, target, body } = c.req.valid("json");
    const owner = c.get("userId");
    const project = await c.env.db.query.projects.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) => and(eq(table.id, projectId), eq(table.owner, owner)),
    });

    if (!project) {
      return c.json({ error: "not_found" }, 404);
    }

    const version = await c.env.db.query.versions.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) => and(eq(table.id, versionId), eq(table.project_id, projectId)),
    });

    if (!version) {
      return c.json({ error: "not_found" }, 404);
    }

    const comment = c.env.commentFactory.create({
      projectId,
      versionId,
      target,
      body,
    });
    await c.env.db.insert(comments).values(comment);

    return c.json({ commentId: comment.id }, 201);
  },
);
