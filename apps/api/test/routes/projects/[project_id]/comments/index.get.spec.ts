import type { FactoryReturn } from "@karibari/db-factory";

import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../../helpers/auth-test";

describe("GET /api/projects/:project_id/comments", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const commentsTest = authTest({
    path: "/api/projects/dummy-id/comments?v=dummy-vid",
    init: { method: "GET" },
  });

  type Comment = FactoryReturn<"comments">;

  commentsTest("200: returns the specified version's comments in order", async ({ auth }) => {
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
    const older = await factories.comments
      .props({
        project_id: () => project.id,
        version_id: () => version.id,
        target: () => "#older",
        body: () => "older",
        created_at: () => 100,
      })
      .create();
    const newer = await factories.comments
      .props({
        project_id: () => project.id,
        version_id: () => version.id,
        target: () => "#newer",
        body: () => "newer",
        created_at: () => 200,
      })
      .create();
    const otherVersion = await factories.versions
      .props({
        project_id: () => project.id,
      })
      .create();
    await factories.comments
      .props({
        project_id: () => project.id,
        version_id: () => otherVersion.id,
        target: () => "#other",
        body: () => "other",
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/comments?v=${version.id}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json<{ comments: Comment[] }>();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ comments: [older, newer] });
  });

  commentsTest("200: resolves the latest version when ?v is omitted", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();
    const olderVersion = await factories.versions
      .props({
        project_id: () => project.id,
        created_at: () => 100,
      })
      .create();
    await factories.comments
      .props({
        project_id: () => project.id,
        version_id: () => olderVersion.id,
        target: () => "#old",
        body: () => "old",
      })
      .create();
    const newerVersion = await factories.versions
      .props({
        project_id: () => project.id,
        created_at: () => 200,
      })
      .create();
    const latest = await factories.comments
      .props({
        project_id: () => project.id,
        version_id: () => newerVersion.id,
        target: () => "#latest",
        body: () => "latest",
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/comments`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json<{ comments: Comment[] }>();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ comments: [latest] });
  });

  commentsTest("404: hides a foreign owner's comments", async ({ auth }) => {
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
      new Request(`http://api/api/projects/${foreign.id}/comments?v=${version.id}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  commentsTest("404: returns not_found for a missing project", async ({ auth }) => {
    // Arrange
    const missingId = crypto.randomUUID();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${missingId}/comments?v=${crypto.randomUUID()}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  commentsTest("404: returns not_found for a version of another project", async ({ auth }) => {
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
      new Request(`http://api/api/projects/${project.id}/comments?v=${otherVersion.id}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });
});
