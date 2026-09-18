import { projects, versions } from "@karibari/db";
import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../server";

import { authenticateSessionMiddleware } from "../../middlewares/authenticate-session";
import { validator } from "../../validator";

const htmlKey = (projectId: string, versionId: string) =>
  // Spec only fixes the prefix `projects/{id}/versions/{v}/`; the file name is our choice.
  `projects/${projectId}/versions/${versionId}/index.html`;

// oxlint-disable unicorn/max-nested-calls -- Keep the request body shape together in one schema.
const bodySchema = v.object({
  html: v.pipe(v.string(), v.nonEmpty()),
  name: v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.transform((value) => (value === "" ? null : value)),
    ),
  ),
});
// oxlint-enable unicorn/max-nested-calls

export const postProjects = new Hono<HonoEnv>().post(
  "",
  authenticateSessionMiddleware,
  validator("json", bodySchema),
  async (c) => {
    const { html, name = null } = c.req.valid("json");
    const owner = c.get("userId");
    const { project, version } = c.env.projectFactory.create({ name, owner });

    // R2 before D1: a failed D1 insert only leaves a harmless orphaned object,
    // While D1-first would leave a meta row whose HTML is missing (r2_missing 404).
    await c.env.HTML_BUCKET.put(htmlKey(project.id, version.id), html);

    await c.env.db.batch([
      c.env.db.insert(projects).values(project),
      c.env.db.insert(versions).values(version),
    ]);

    return c.json({ projectId: project.id, versionId: version.id, url: `/p/${project.id}` }, 201);
  },
);
