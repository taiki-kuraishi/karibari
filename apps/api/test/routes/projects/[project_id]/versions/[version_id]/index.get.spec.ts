import type { FactoryReturn } from "@karibari/db-factory";

import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../../../helpers/auth-test";

describe("GET /api/projects/:project_id/versions/:version_id", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const versionTest = authTest({
    path: "/api/projects/dummy-id/versions/dummy-vid",
    init: { method: "GET" },
  });

  type Version = FactoryReturn<"versions">;

  versionTest("200: returns the owner's version as-is", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();
    const version = await factories.versions
      .props({
        project_id: () => project.id,
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/versions/${version.id}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json<{ version: Version }>();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ version });
  });

  versionTest("404: hides a foreign owner's version", async ({ auth }) => {
    // Arrange
    const foreign = await factories.projects
      .props({
        name: () => "foreign",
      })
      .create();
    const version = await factories.versions
      .props({
        project_id: () => foreign.id,
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${foreign.id}/versions/${version.id}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  versionTest("404: returns not_found for a missing project", async ({ auth }) => {
    // Arrange
    const missingId = crypto.randomUUID();
    const missingVersionId = crypto.randomUUID();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${missingId}/versions/${missingVersionId}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  versionTest("404: returns not_found for a version of another project", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();
    const other = await factories.projects.create();
    const otherVersion = await factories.versions
      .props({
        project_id: () => other.id,
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/versions/${otherVersion.id}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });
});
