import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../helpers/auth-test";

describe("GET /api/versions", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const versionsTest = authTest({
    path: "/api/versions?project_id=dummy-id",
    init: { method: "GET" },
  });

  versionsTest(
    "200: returns the owned projects' versions in submission order and drops other ids",
    async ({ auth }) => {
      // Arrange
      const first = await factories.projects.props({ owner: () => auth.userId }).create();
      const second = await factories.projects.props({ owner: () => auth.userId }).create();
      const foreign = await factories.projects.create();
      // Ids are chosen so that sorting by id would reverse the insertion order.
      const firstOlder = await factories.versions
        .props({ id: () => `c-${crypto.randomUUID()}`, project_id: () => first.id })
        .create();
      const secondOnly = await factories.versions
        .props({ id: () => `b-${crypto.randomUUID()}`, project_id: () => second.id })
        .create();
      const firstNewer = await factories.versions
        .props({ id: () => `a-${crypto.randomUUID()}`, project_id: () => first.id })
        .create();
      await factories.versions.props({ project_id: () => foreign.id }).create();
      const query = new URLSearchParams([
        ["project_id", first.id],
        ["project_id", second.id],
        ["project_id", foreign.id],
        ["project_id", "missing-id"],
      ]);

      // Act
      const response = await exports.default.fetch(
        new Request(`http://api/api/versions?${query.toString()}`, {
          headers: new Headers(auth.headers),
        }),
      );
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body).toStrictEqual({ versions: [firstOlder, secondOnly, firstNewer] });
    },
  );

  versionsTest("200: accepts a single project_id", async ({ auth }) => {
    // Arrange
    const project = await factories.projects.props({ owner: () => auth.userId }).create();
    const version = await factories.versions.props({ project_id: () => project.id }).create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/versions?project_id=${project.id}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ versions: [version] });
  });

  versionsTest(
    "200: returns an empty list when no requested project is owned",
    async ({ auth }) => {
      // Arrange
      const foreign = await factories.projects.create();
      await factories.versions.props({ project_id: () => foreign.id }).create();

      // Act
      const response = await exports.default.fetch(
        new Request(`http://api/api/versions?project_id=${foreign.id}`, {
          headers: new Headers(auth.headers),
        }),
      );
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body).toStrictEqual({ versions: [] });
    },
  );

  versionsTest("400: rejects a request without project_id", async ({ auth }) => {
    // Arrange
    // No project rows are needed: validation runs before any query.
    // Act
    const response = await exports.default.fetch(
      new Request("http://api/api/versions", { headers: new Headers(auth.headers) }),
    );

    // Assert
    expect(response.status).toBe(400);
  });

  versionsTest("400: rejects more than 50 project ids", async ({ auth }) => {
    // Arrange
    const query = new URLSearchParams(
      Array.from({ length: 51 }, (_, index) => ["project_id", `project-${index}`]),
    );

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/versions?${query.toString()}`, {
        headers: new Headers(auth.headers),
      }),
    );

    // Assert
    expect(response.status).toBe(400);
  });
});
