import type { FactoryReturn } from "@karibari/db-factory";

import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../../helpers/auth-test";

describe("GET /api/projects/:project_id/versions", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const versionsTest = authTest({
    path: "/api/projects/dummy-id/versions",
    init: { method: "GET" },
  });

  type Version = FactoryReturn<"versions">;

  versionsTest("200: returns the owner's versions in order", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();
    const older = await factories.versions
      .props({
        project_id: () => project.id,
        created_at: () => 100,
      })
      .create();
    const newer = await factories.versions
      .props({
        project_id: () => project.id,
        created_at: () => 200,
      })
      .create();
    const other = await factories.projects.create();
    await factories.versions
      .props({
        project_id: () => other.id,
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/versions`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json<{ versions: Version[] }>();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ versions: [older, newer] });
  });

  versionsTest("200: returns an empty list when the project has no versions", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/versions`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json<{ versions: Version[] }>();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ versions: [] });
  });

  versionsTest("404: hides a foreign owner's versions", async ({ auth }) => {
    // Arrange
    const foreign = await factories.projects
      .props({
        name: () => "foreign",
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${foreign.id}/versions`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  versionsTest("404: returns not_found for a missing project", async ({ auth }) => {
    // Arrange
    const missingId = crypto.randomUUID();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${missingId}/versions`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });
});
