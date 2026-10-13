import { projects, screens, versions } from "@karibari/db";
import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../server";

import { screenHtmlKey } from "../../screen-html-key";
import { validator } from "../../validator";
import { versionBodySchema } from "../../version-body-schema";

// oxlint-disable unicorn/max-nested-calls -- Keep the request body shape together in one schema.
// `intersect` keeps the version rules, including the type and screen count check, in one place.
const bodySchema = v.intersect([
  v.object({
    name: v.optional(
      v.pipe(
        v.string(),
        v.trim(),
        v.transform((value) => (value === "" ? null : value)),
      ),
    ),
  }),
  versionBodySchema,
]);
// oxlint-enable unicorn/max-nested-calls

export const postProjectsRoute = new Hono<HonoEnv>().post(
  "",
  validator("json", bodySchema),
  async (c) => {
    const { name = null, type, screens: inputs } = c.req.valid("json");
    const owner = c.get("userId");
    const { project, version } = c.env.projectFactory.create({ name, owner, type });
    const entries = inputs.map((input) => ({
      html: input.html,
      screen: c.env.screenFactory.create({
        height: input.height,
        name: input.name ?? null,
        versionId: version.id,
        width: input.width,
      }),
    }));

    // R2 before D1: a failed D1 insert only leaves harmless orphaned objects,
    // While D1-first would leave a meta row whose HTML is missing (r2_missing 404).
    await Promise.all(
      entries.map(
        async ({ html, screen }) =>
          await c.env.HTML_BUCKET.put(
            screenHtmlKey({ projectId: project.id, versionId: version.id, screenId: screen.id }),
            html,
          ),
      ),
    );

    await c.env.db.batch([
      c.env.db.insert(projects).values(project),
      c.env.db.insert(versions).values(version),
      // One multi-row insert keeps the submitted order in `rowid`.
      c.env.db.insert(screens).values(entries.map(({ screen }) => screen)),
    ]);

    return c.json(
      {
        projectId: project.id,
        versionId: version.id,
        url: `${c.env.VIEWER_ORIGIN}/p/${project.id}`,
      },
      201,
    );
  },
);
