import type { FactoryReturn } from "@karibari/db-factory";

import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../../helpers/auth-test";

describe("POST /api/projects/:project_id/versions", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const versionsTest = authTest({
    path: "/api/projects/dummy-id/versions",
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screens: [{ html: "<p>protected</p>" }] }),
    },
  });

  type Version = FactoryReturn<"versions">;
  type Screen = FactoryReturn<"screens">;

  versionsTest("201: adds a version of HTML screens to the owner's project", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();
    const screens = [
      { html: "<p>top</p>", name: "top", width: 390, height: 2400 },
      { html: "<p>detail</p>" },
    ];
    const headers = new Headers(auth.headers);
    headers.set("content-type", "application/json");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/versions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ screens }),
      }),
    );
    const body = await response.json<{ versionId: string; url: string }>();
    const version = await db.query.versions.findFirst({
      where: (table, { eq }) => eq(table.id, body.versionId),
    });
    const stored = await db.query.screens.findMany({
      where: (table, { eq }) => eq(table.version_id, body.versionId),
      orderBy: (_table, { asc, sql }) => [asc(sql`rowid`)],
    });
    const htmls = await Promise.all(
      stored.map(async (screen) => {
        const object = await env.HTML_BUCKET.get(
          `projects/${project.id}/versions/${body.versionId}/screens/${screen.id}.html`,
        );

        return await object?.text();
      }),
    );

    // Assert
    expect(response.status).toBe(201);
    expect(body).toStrictEqual({
      versionId: expect.any(String),
      url: `https://karibari.tsar-bmb.org/p/${project.id}?v=${body.versionId}`,
    });
    expect(version).toStrictEqual({
      id: body.versionId,
      project_id: project.id,
      type: "canvas",
      created_at: expect.any(Number),
    } satisfies Version);
    expect(stored).toStrictEqual([
      { id: expect.any(String), version_id: body.versionId, name: "top", width: 390, height: 2400 },
      { id: expect.any(String), version_id: body.versionId, name: null, width: 1440, height: 900 },
    ] satisfies Screen[]);
    expect(htmls).toStrictEqual(["<p>top</p>", "<p>detail</p>"]);
  });

  versionsTest("201: stores the declared full type", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
      })
      .create();
    const headers = new Headers(auth.headers);
    headers.set("content-type", "application/json");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/versions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ type: "full", screens: [{ html: "<p>app</p>" }] }),
      }),
    );
    const body = await response.json<{ versionId: string }>();
    const version = await db.query.versions.findFirst({
      columns: { type: true },
      where: (table, { eq }) => eq(table.id, body.versionId),
    });

    // Assert
    expect(response.status).toBe(201);
    expect(version).toStrictEqual({ type: "full" });
  });

  versionsTest(
    "201: sets the project's updated_at to the new version's created_at",
    async ({ auth }) => {
      // Arrange
      const project = await factories.projects
        .props({
          owner: () => auth.userId,
          created_at: () => 100,
          updated_at: () => 100,
        })
        .create();
      const headers = new Headers(auth.headers);
      headers.set("content-type", "application/json");

      // Act
      const response = await exports.default.fetch(
        new Request(`http://api/api/projects/${project.id}/versions`, {
          method: "POST",
          headers,
          body: JSON.stringify({ screens: [{ html: "<p>hi</p>" }] }),
        }),
      );
      const body = await response.json<{ versionId: string }>();
      const version = await db.query.versions.findFirst({
        columns: { created_at: true },
        where: (table, { eq }) => eq(table.id, body.versionId),
      });
      const updated = await db.query.projects.findFirst({
        columns: { created_at: true, updated_at: true },
        where: (table, { eq }) => eq(table.id, project.id),
      });

      // Assert
      expect(response.status).toBe(201);
      expect(updated).toStrictEqual({ created_at: 100, updated_at: version?.created_at });
    },
  );

  versionsTest("404: hides a foreign owner's project without writing", async ({ auth }) => {
    // Arrange
    const foreign = await factories.projects
      .props({
        name: () => "foreign",
      })
      .create();
    const headers = new Headers(auth.headers);
    headers.set("content-type", "application/json");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${foreign.id}/versions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ screens: [{ html: "<p>hi</p>" }] }),
      }),
    );
    const body = await response.json();
    const written = await db.query.versions.findMany({
      where: (table, { eq }) => eq(table.project_id, foreign.id),
    });

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
    expect(written).toStrictEqual([]);
  });

  versionsTest("404: returns not_found for a missing project", async ({ auth }) => {
    // Arrange
    const missingId = crypto.randomUUID();
    const headers = new Headers(auth.headers);
    headers.set("content-type", "application/json");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${missingId}/versions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ screens: [{ html: "<p>hi</p>" }] }),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  versionsTest("400: rejects a full version with two screens without writing", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
      })
      .create();
    const headers = new Headers(auth.headers);
    headers.set("content-type", "application/json");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/versions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "full",
          screens: [{ html: "<p>a</p>" }, { html: "<p>b</p>" }],
        }),
      }),
    );
    const body = await response.json();
    const written = await db.query.versions.findMany({
      where: (table, { eq }) => eq(table.project_id, project.id),
    });

    // Assert
    expect(response.status).toBe(400);
    expect(body).toStrictEqual({ cause: expect.any(Array) });
    expect(written).toStrictEqual([]);
  });
});
