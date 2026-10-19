import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../helpers/auth-test";

describe("GET /api/comments", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const commentsTest = authTest({
    path: "/api/comments?project_id=dummy-id",
    init: { method: "GET" },
  });

  commentsTest(
    "200: returns the owned projects' comments across versions by time then id and drops other ids",
    async ({ auth }) => {
      // Arrange
      const first = await factories.projects.props({ owner: () => auth.userId }).create();
      const second = await factories.projects.props({ owner: () => auth.userId }).create();
      const foreign = await factories.projects.create();
      const older = await factories.versions.props({ project_id: () => first.id }).create();
      const newer = await factories.versions.props({ project_id: () => first.id }).create();
      const secondVersion = await factories.versions
        .props({ project_id: () => second.id })
        .create();
      const latest = await factories.comments
        .props({ project_id: () => first.id, version_id: () => older.id, created_at: () => 300 })
        .create();
      // Same second: the id breaks the tie, so these are inserted in reverse id order.
      const tiedB = await factories.comments
        .props({
          id: () => `b-${crypto.randomUUID()}`,
          project_id: () => second.id,
          version_id: () => secondVersion.id,
          created_at: () => 200,
        })
        .create();
      const tiedA = await factories.comments
        .props({
          id: () => `a-${crypto.randomUUID()}`,
          project_id: () => first.id,
          version_id: () => newer.id,
          created_at: () => 200,
        })
        .create();
      const earliest = await factories.comments
        .props({ project_id: () => first.id, version_id: () => newer.id, created_at: () => 100 })
        .create();
      await factories.comments.props({ project_id: () => foreign.id }).create();
      const query = new URLSearchParams([
        ["project_id", first.id],
        ["project_id", second.id],
        ["project_id", foreign.id],
        ["project_id", "missing-id"],
      ]);

      // Act
      const response = await exports.default.fetch(
        new Request(`http://api/api/comments?${query.toString()}`, {
          headers: new Headers(auth.headers),
        }),
      );
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body).toStrictEqual({ comments: [earliest, tiedA, tiedB, latest] });
    },
  );

  commentsTest(
    "200: returns an empty list when no requested project is owned",
    async ({ auth }) => {
      // Arrange
      const foreign = await factories.projects.create();
      await factories.comments.props({ project_id: () => foreign.id }).create();

      // Act
      const response = await exports.default.fetch(
        new Request(`http://api/api/comments?project_id=${foreign.id}`, {
          headers: new Headers(auth.headers),
        }),
      );
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body).toStrictEqual({ comments: [] });
    },
  );

  commentsTest("400: rejects a request without project_id", async ({ auth }) => {
    // Arrange
    // No project rows are needed: validation runs before any query.
    // Act
    const response = await exports.default.fetch(
      new Request("http://api/api/comments", { headers: new Headers(auth.headers) }),
    );

    // Assert
    expect(response.status).toBe(400);
  });

  commentsTest("400: rejects more than 50 project ids", async ({ auth }) => {
    // Arrange
    const query = new URLSearchParams(
      Array.from({ length: 51 }, (_, index) => ["project_id", `project-${index}`]),
    );

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/comments?${query.toString()}`, {
        headers: new Headers(auth.headers),
      }),
    );

    // Assert
    expect(response.status).toBe(400);
  });
});
