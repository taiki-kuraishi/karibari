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
      body: JSON.stringify({ html: "<p>protected</p>" }),
    },
  });

  type Version = FactoryReturn<"versions">;

  versionsTest("201: adds an HTML version to the owner's project", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();
    const html = "<p>hi</p>";
    const headers = new Headers(auth.headers);
    headers.set("content-type", "application/json");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/versions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ html }),
      }),
    );
    const body = await response.json<{ versionId: string; url: string }>();
    const version = await db.query.versions.findFirst({
      where: (table, { eq }) => eq(table.id, body.versionId),
    });
    const stored = await env.HTML_BUCKET.get(
      `projects/${project.id}/versions/${body.versionId}/index.html`,
    );

    // Assert
    expect(response.status).toBe(201);
    expect(body).toStrictEqual({
      versionId: expect.any(String),
      url: `/p/${project.id}?v=${body.versionId}`,
    });
    expect(version).toStrictEqual({
      id: body.versionId,
      project_id: project.id,
      created_at: expect.any(Number),
    } satisfies Version);
    expect(await stored?.text()).toBe(html);
  });

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
        body: JSON.stringify({ html: "<p>hi</p>" }),
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
        body: JSON.stringify({ html: "<p>hi</p>" }),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });
});
