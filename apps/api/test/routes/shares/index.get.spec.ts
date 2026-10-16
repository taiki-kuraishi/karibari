import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../helpers/auth-test";

describe("GET /api/shares", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const sharesTest = authTest({ path: "/api/shares?project_id=dummy-id", init: { method: "GET" } });

  sharesTest("200: returns the owned projects' shares and drops other ids", async ({ auth }) => {
    // Arrange
    const first = await factories.projects.props({ owner: () => auth.userId }).create();
    const second = await factories.projects.props({ owner: () => auth.userId }).create();
    const foreign = await factories.projects.create();
    const secondShare = await factories.shares
      .props({ id: () => `b-${crypto.randomUUID()}`, project_id: () => second.id })
      .create();
    const firstShare = await factories.shares
      .props({ id: () => `a-${crypto.randomUUID()}`, project_id: () => first.id })
      .create();
    await factories.shares.props({ project_id: () => foreign.id }).create();
    const query = new URLSearchParams([
      ["project_id", first.id],
      ["project_id", second.id],
      ["project_id", foreign.id],
      ["project_id", "missing-id"],
    ]);

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/shares?${query.toString()}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ shares: [firstShare, secondShare] });
  });

  sharesTest("200: returns an empty list when no requested project is owned", async ({ auth }) => {
    // Arrange
    const foreign = await factories.projects.create();
    await factories.shares.props({ project_id: () => foreign.id }).create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/shares?project_id=${foreign.id}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ shares: [] });
  });

  sharesTest("400: rejects a request without project_id", async ({ auth }) => {
    // Arrange
    // No project rows are needed: validation runs before any query.
    // Act
    const response = await exports.default.fetch(
      new Request("http://api/api/shares", { headers: new Headers(auth.headers) }),
    );

    // Assert
    expect(response.status).toBe(400);
  });

  sharesTest("400: rejects more than 50 project ids", async ({ auth }) => {
    // Arrange
    const query = new URLSearchParams(
      Array.from({ length: 51 }, (_, index) => ["project_id", `project-${index}`]),
    );

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/shares?${query.toString()}`, {
        headers: new Headers(auth.headers),
      }),
    );

    // Assert
    expect(response.status).toBe(400);
  });
});
