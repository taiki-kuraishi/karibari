import { projects, screens, versions } from "@karibari/db";
import { eq as drizzleEq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../../server";

import { screenHtmlKey } from "../../../../screen-html-key";
import { validator } from "../../../../validator";
import { versionBodySchema } from "../../../../version-body-schema";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
});

export const postProjectVersionsRoute = new Hono<HonoEnv>().post(
  "",
  validator("param", paramSchema),
  validator("json", versionBodySchema),
  async (c) => {
    const { project_id: projectId } = c.req.valid("param");
    const { type, screens: inputs } = c.req.valid("json");
    const owner = c.get("userId");
    const project = await c.env.db.query.projects.findFirst({
      columns: { id: true },
      where: (table, { and, eq }) => and(eq(table.id, projectId), eq(table.owner, owner)),
    });

    if (!project) {
      return c.json({ error: "not_found" }, 404);
    }

    const version = c.env.versionFactory.create({ projectId, type });
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
            screenHtmlKey({ projectId, versionId: version.id, screenId: screen.id }),
            html,
          ),
      ),
    );
    await c.env.db.batch([
      c.env.db.insert(versions).values(version),
      // One multi-row insert keeps the submitted order in `rowid`.
      c.env.db.insert(screens).values(entries.map(({ screen }) => screen)),
      c.env.db
        .update(projects)
        .set({ updated_at: version.created_at })
        .where(drizzleEq(projects.id, projectId)),
    ]);

    return c.json(
      { versionId: version.id, url: `${c.env.VIEWER_ORIGIN}/p/${projectId}?v=${version.id}` },
      201,
    );
  },
);
