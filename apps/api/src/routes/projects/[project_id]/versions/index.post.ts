import { versions } from "@karibari/db";
import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../../server";

import { authenticateSessionMiddleware } from "../../../../middlewares/authenticate-session";
import { validator } from "../../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
});

const bodySchema = v.object({
  html: v.pipe(v.string(), v.nonEmpty()),
});

export const postProjectVersions = new Hono<HonoEnv>().post(
  "",
  authenticateSessionMiddleware,
  validator("param", paramSchema),
  validator("json", bodySchema),
  async (c) => {
    const { project_id: projectId } = c.req.valid("param");
    const { html } = c.req.valid("json");
    const owner = c.get("userId");
    const project = await c.env.db.query.projects.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) => and(eq(table.id, projectId), eq(table.owner, owner)),
    });

    if (!project) {
      return c.json({ error: "not_found" }, 404);
    }

    const version = c.env.versionFactory.create({ projectId });

    // R2 before D1: a failed D1 insert only leaves a harmless orphaned object,
    // While D1-first would leave a meta row whose HTML is missing (r2_missing 404).
    await c.env.HTML_BUCKET.put(`projects/${projectId}/versions/${version.id}/index.html`, html);
    await c.env.db.insert(versions).values(version);

    return c.json({ versionId: version.id, url: `/p/${projectId}?v=${version.id}` }, 201);
  },
);
