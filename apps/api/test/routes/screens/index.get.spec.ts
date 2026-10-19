import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../helpers/auth-test";

describe("GET /api/screens", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const screensTest = authTest({
    path: "/api/screens?version_id=dummy-vid",
    init: { method: "GET" },
  });

  screensTest(
    "200: returns the owned versions' screens in submission order and drops other ids",
    async ({ auth }) => {
      // Arrange
      const project = await factories.projects.props({ owner: () => auth.userId }).create();
      const first = await factories.versions.props({ project_id: () => project.id }).create();
      const second = await factories.versions.props({ project_id: () => project.id }).create();
      const foreign = await factories.versions.create();
      // Ids are chosen so that sorting by id would reverse the insertion order.
      const firstScreen = await factories.screens
        .props({ id: () => `c-${crypto.randomUUID()}`, version_id: () => first.id })
        .create();
      const secondScreen = await factories.screens
        .props({ id: () => `b-${crypto.randomUUID()}`, version_id: () => second.id })
        .create();
      const firstLater = await factories.screens
        .props({ id: () => `a-${crypto.randomUUID()}`, version_id: () => first.id })
        .create();
      await factories.screens.props({ version_id: () => foreign.id }).create();
      const query = new URLSearchParams([
        ["version_id", first.id],
        ["version_id", second.id],
        ["version_id", foreign.id],
        ["version_id", "missing-vid"],
      ]);

      // Act
      const response = await exports.default.fetch(
        new Request(`http://api/api/screens?${query.toString()}`, {
          headers: new Headers(auth.headers),
        }),
      );
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body).toStrictEqual({ screens: [firstScreen, secondScreen, firstLater] });
    },
  );

  screensTest("200: returns an empty list when no requested version is owned", async ({ auth }) => {
    // Arrange
    const foreign = await factories.versions.create();
    await factories.screens.props({ version_id: () => foreign.id }).create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/screens?version_id=${foreign.id}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ screens: [] });
  });

  screensTest("400: rejects a request without version_id", async ({ auth }) => {
    // Arrange
    // No version rows are needed: validation runs before any query.
    // Act
    const response = await exports.default.fetch(
      new Request("http://api/api/screens", { headers: new Headers(auth.headers) }),
    );

    // Assert
    expect(response.status).toBe(400);
  });

  screensTest("400: rejects more than 50 version ids", async ({ auth }) => {
    // Arrange
    const query = new URLSearchParams(
      Array.from({ length: 51 }, (_, index) => ["version_id", `version-${index}`]),
    );

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/screens?${query.toString()}`, {
        headers: new Headers(auth.headers),
      }),
    );

    // Assert
    expect(response.status).toBe(400);
  });
});
