import { Hono } from "hono";
import * as v from "valibot";

import type { HonoEnv } from "../../../../../server";

import { validator } from "../../../../../validator";

const paramSchema = v.object({
  project_id: v.pipe(v.string(), v.nonEmpty()),
  version_id: v.pipe(v.string(), v.nonEmpty()),
});

export const getProjectVersionContent = new Hono<HonoEnv>().get(
  "",
  validator("param", paramSchema),
  async (c) => {
    const { project_id: projectId, version_id: versionId } = c.req.valid("param");
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

    const object = await c.env.HTML_BUCKET.get(
      `projects/${projectId}/versions/${versionId}/index.html`,
    );

    if (!object) {
      return c.json({ error: "not_found" }, 404);
    }

    // Untrusted LLM-authored HTML, rendered by the Viewer in a sandboxed iframe.
    // `allow-scripts` without `allow-same-origin` keeps the document in an opaque origin.
    // Even opened directly, its scripts hold no cookie and cannot make credentialed API calls.
    // Adding `allow-same-origin` would give both back.
    return c.html(await object.text(), 200, {
      "Content-Security-Policy": "sandbox allow-scripts",
      // Prevent content-type sniffing that could re-classify the body as script.
      "X-Content-Type-Options": "nosniff",
    });
  },
);
