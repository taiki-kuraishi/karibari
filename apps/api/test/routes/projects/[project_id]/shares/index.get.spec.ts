import type { FactoryReturn } from "@karibari/db-factory";

import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../../helpers/auth-test";

describe("GET /api/projects/:project_id/shares", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const sharesTest = authTest({ path: "/api/projects/dummy-id/shares", init: { method: "GET" } });

  type Share = FactoryReturn<"shares">;

  sharesTest("200: returns the owner's shares in order", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();
    const first = await factories.shares
      .props({
        id: () => "share-a",
        project_id: () => project.id,
        kind: () => "invite",
        token: () => "token-a",
      })
      .create();
    const second = await factories.shares
      .props({
        id: () => "share-b",
        project_id: () => project.id,
        kind: () => "private",
      })
      .create();
    const other = await factories.projects.create();
    await factories.shares
      .props({
        project_id: () => other.id,
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/shares`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json<{ shares: Share[] }>();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ shares: [first, second] });
  });

  sharesTest("200: returns an empty list when the project has no shares", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/shares`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json<{ shares: Share[] }>();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ shares: [] });
  });

  sharesTest("404: hides a foreign owner's shares", async ({ auth }) => {
    // Arrange
    const foreign = await factories.projects
      .props({
        name: () => "foreign",
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${foreign.id}/shares`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  sharesTest("404: returns not_found for a missing project", async ({ auth }) => {
    // Arrange
    const missingId = crypto.randomUUID();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${missingId}/shares`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });
});
