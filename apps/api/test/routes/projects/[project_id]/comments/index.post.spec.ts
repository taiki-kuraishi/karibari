import type { FactoryReturn } from "@karibari/db-factory";

import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../../helpers/auth-test";

describe("POST /api/projects/:project_id/comments", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const commentsTest = authTest({
    path: "/api/projects/dummy-id/comments",
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ versionId: "dummy-vid", target: "#a", body: "protected" }),
    },
  });

  type Comment = FactoryReturn<"comments">;

  commentsTest("201: saves a comment on the owner's version", async ({ auth }) => {
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
    const headers = new Headers(auth.headers);
    headers.set("content-type", "application/json");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify({ versionId: version.id, target: "#hero", body: "Nice!" }),
      }),
    );
    const body = await response.json<{ commentId: string }>();
    const comment = await db.query.comments.findFirst({
      where: (table, { eq }) => eq(table.id, body.commentId),
    });

    // Assert
    expect(response.status).toBe(201);
    expect(body).toStrictEqual({ commentId: expect.any(String) });
    expect(comment).toStrictEqual({
      id: body.commentId,
      project_id: project.id,
      version_id: version.id,
      target: "#hero",
      body: "Nice!",
      created_at: expect.any(Number),
    } satisfies Comment);
  });

  commentsTest("404: hides a foreign owner's project without writing", async ({ auth }) => {
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
    const headers = new Headers(auth.headers);
    headers.set("content-type", "application/json");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${foreign.id}/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify({ versionId: version.id, target: "#hero", body: "Hi" }),
      }),
    );
    const body = await response.json();
    const written = await db.query.comments.findMany({
      where: (table, { eq }) => eq(table.project_id, foreign.id),
    });

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
    expect(written).toStrictEqual([]);
  });

  commentsTest("404: returns not_found for a missing project", async ({ auth }) => {
    // Arrange
    const missingId = crypto.randomUUID();
    const missingVersionId = crypto.randomUUID();
    const headers = new Headers(auth.headers);
    headers.set("content-type", "application/json");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${missingId}/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify({ versionId: missingVersionId, target: "#hero", body: "Hi" }),
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
    const headers = new Headers(auth.headers);
    headers.set("content-type", "application/json");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify({ versionId: otherVersion.id, target: "#hero", body: "Hi" }),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });
});
