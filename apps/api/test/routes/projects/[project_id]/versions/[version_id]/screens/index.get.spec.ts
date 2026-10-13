import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../../../../helpers/auth-test";

describe("GET /api/projects/:project_id/versions/:version_id/screens", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const screensTest = authTest({
    path: "/api/projects/dummy-id/versions/dummy-vid/screens",
    init: { method: "GET" },
  });

  screensTest("200: returns the version's screens in submission order", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
      })
      .create();
    const version = await factories.versions
      .props({
        project_id: () => project.id,
      })
      .create();
    // Ids are chosen so that sorting by id would reverse the insertion order.
    const first = await factories.screens
      .props({
        id: () => `b-${crypto.randomUUID()}`,
        version_id: () => version.id,
        name: () => "top",
        width: () => 390,
        height: () => 1200,
      })
      .create();
    const second = await factories.screens
      .props({
        id: () => `a-${crypto.randomUUID()}`,
        version_id: () => version.id,
        name: () => null,
      })
      .create();
    const otherVersion = await factories.versions
      .props({
        project_id: () => project.id,
      })
      .create();
    await factories.screens
      .props({
        version_id: () => otherVersion.id,
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/versions/${version.id}/screens`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({
      screens: [
        { id: first.id, name: "top", width: 390, height: 1200 },
        { id: second.id, name: null, width: second.width, height: second.height },
      ],
    });
  });

  screensTest("404: hides a foreign owner's screens", async ({ auth }) => {
    // Arrange
    const foreign = await factories.projects.create();
    const version = await factories.versions
      .props({
        project_id: () => foreign.id,
      })
      .create();
    await factories.screens
      .props({
        version_id: () => version.id,
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${foreign.id}/versions/${version.id}/screens`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  screensTest("404: hides a version that belongs to another project", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
      })
      .create();
    const foreignVersion = await factories.versions.create();
    await factories.screens
      .props({
        version_id: () => foreignVersion.id,
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/versions/${foreignVersion.id}/screens`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  screensTest("404: returns not_found for a missing version", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/versions/${crypto.randomUUID()}/screens`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });
});
