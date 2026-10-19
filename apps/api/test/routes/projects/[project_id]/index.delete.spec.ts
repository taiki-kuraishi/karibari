import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../helpers/auth-test";

describe("DELETE /api/projects/:project_id", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const projectTest = authTest({ path: "/api/projects/dummy-id", init: { method: "DELETE" } });

  projectTest(
    "200: deletes the project's rows in every table and its HTML objects",
    async ({ auth }) => {
      // Arrange
      const project = await factories.projects.props({ owner: () => auth.userId }).create();
      const versions = await Promise.all(
        [1, 2].map(
          async () => await factories.versions.props({ project_id: () => project.id }).create(),
        ),
      );
      await Promise.all(
        versions.map(async (version) => {
          const screen = await factories.screens.props({ version_id: () => version.id }).create();
          await factories.comments
            .props({ project_id: () => project.id, version_id: () => version.id })
            .create();
          await env.HTML_BUCKET.put(
            `projects/${project.id}/versions/${version.id}/screens/${screen.id}.html`,
            "<p>gone</p>",
          );
        }),
      );
      await factories.shares.props({ project_id: () => project.id }).create();
      const versionIds = versions.map((version) => version.id);

      // Act
      const response = await exports.default.fetch(
        new Request(`http://api/api/projects/${project.id}`, {
          method: "DELETE",
          headers: new Headers(auth.headers),
        }),
      );
      const body = await response.json();
      const listed = await env.HTML_BUCKET.list({ prefix: `projects/${project.id}/` });
      const left = {
        projects: await db.query.projects.findMany({
          where: (table, { eq }) => eq(table.id, project.id),
        }),
        versions: await db.query.versions.findMany({
          where: (table, { eq }) => eq(table.project_id, project.id),
        }),
        screens: await db.query.screens.findMany({
          where: (table, { inArray }) => inArray(table.version_id, versionIds),
        }),
        comments: await db.query.comments.findMany({
          where: (table, { eq }) => eq(table.project_id, project.id),
        }),
        shares: await db.query.shares.findMany({
          where: (table, { eq }) => eq(table.project_id, project.id),
        }),
        objects: listed.objects,
      };

      // Assert
      expect(response.status).toBe(200);
      expect(body).toStrictEqual({ deleted: true });
      expect(left).toStrictEqual({
        projects: [],
        versions: [],
        screens: [],
        comments: [],
        shares: [],
        objects: [],
      });
    },
  );

  projectTest("200: keeps the owner's other projects intact", async ({ auth }) => {
    // Arrange
    const target = await factories.projects.props({ owner: () => auth.userId }).create();
    const kept = await factories.projects.props({ owner: () => auth.userId }).create();
    const keptVersion = await factories.versions.props({ project_id: () => kept.id }).create();
    const keptScreen = await factories.screens.props({ version_id: () => keptVersion.id }).create();
    const keptKey = `projects/${kept.id}/versions/${keptVersion.id}/screens/${keptScreen.id}.html`;
    await env.HTML_BUCKET.put(keptKey, "<p>kept</p>");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${target.id}`, {
        method: "DELETE",
        headers: new Headers(auth.headers),
      }),
    );
    const stored = await db.query.screens.findMany({
      where: (table, { eq }) => eq(table.version_id, keptVersion.id),
    });
    const object = await env.HTML_BUCKET.get(keptKey);

    // Assert
    expect(response.status).toBe(200);
    expect(stored).toStrictEqual([keptScreen]);
    expect(await object?.text()).toBe("<p>kept</p>");
  });

  projectTest("404: leaves a foreign owner's project and its HTML in place", async ({ auth }) => {
    // Arrange
    const foreign = await factories.projects.create();
    const version = await factories.versions.props({ project_id: () => foreign.id }).create();
    const key = `projects/${foreign.id}/versions/${version.id}/screens/s.html`;
    await env.HTML_BUCKET.put(key, "<p>foreign</p>");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${foreign.id}`, {
        method: "DELETE",
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();
    const stored = await db.query.projects.findFirst({
      where: (table, { eq }) => eq(table.id, foreign.id),
    });
    const object = await env.HTML_BUCKET.get(key);

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
    expect(stored).toStrictEqual(foreign);
    expect(await object?.text()).toBe("<p>foreign</p>");
  });

  projectTest("404: returns not_found for a missing project", async ({ auth }) => {
    // Arrange
    const missingId = crypto.randomUUID();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${missingId}`, {
        method: "DELETE",
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });
});
