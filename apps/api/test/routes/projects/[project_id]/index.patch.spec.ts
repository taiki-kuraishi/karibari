import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../helpers/auth-test";

describe("PATCH /api/projects/:project_id", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const projectTest = authTest({
    path: "/api/projects/dummy-id",
    init: {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "renamed" }),
    },
  });

  projectTest(
    "200: renames the owner's project with a trimmed name and advances updated_at",
    async ({ auth }) => {
      // Arrange
      const project = await factories.projects
        .props({
          owner: () => auth.userId,
          name: () => "before",
          created_at: () => 100,
          updated_at: () => 100,
        })
        .create();
      const headers = new Headers(auth.headers);
      headers.set("content-type", "application/json");

      // Act
      const response = await exports.default.fetch(
        new Request(`http://api/api/projects/${project.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ name: "  after  " }),
        }),
      );
      const body = await response.json();
      const stored = await db.query.projects.findFirst({
        where: (table, { eq }) => eq(table.id, project.id),
      });

      // Assert
      expect(response.status).toBe(200);
      expect(body).toStrictEqual({ project: stored });
      expect(stored).toStrictEqual({
        ...project,
        name: "after",
        updated_at: expect.toSatisfy((value: number) => value > 100),
      });
    },
  );

  projectTest("200: clears the name when it is blank", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({ owner: () => auth.userId, name: () => "before" })
      .create();
    const headers = new Headers(auth.headers);
    headers.set("content-type", "application/json");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name: "   " }),
      }),
    );
    const stored = await db.query.projects.findFirst({
      columns: { name: true },
      where: (table, { eq }) => eq(table.id, project.id),
    });

    // Assert
    expect(response.status).toBe(200);
    expect(stored).toStrictEqual({ name: null });
  });

  projectTest("404: leaves a foreign owner's project unchanged", async ({ auth }) => {
    // Arrange
    const foreign = await factories.projects.props({ name: () => "foreign" }).create();
    const headers = new Headers(auth.headers);
    headers.set("content-type", "application/json");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${foreign.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name: "taken" }),
      }),
    );
    const body = await response.json();
    const stored = await db.query.projects.findFirst({
      where: (table, { eq }) => eq(table.id, foreign.id),
    });

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
    expect(stored).toStrictEqual(foreign);
  });

  projectTest("404: returns not_found for a missing project", async ({ auth }) => {
    // Arrange
    const missingId = crypto.randomUUID();
    const headers = new Headers(auth.headers);
    headers.set("content-type", "application/json");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${missingId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name: "ghost" }),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  projectTest("400: rejects a body without a string name", async ({ auth }) => {
    // Arrange
    const project = await factories.projects.props({ owner: () => auth.userId }).create();
    const headers = new Headers(auth.headers);
    headers.set("content-type", "application/json");

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({}),
      }),
    );

    // Assert
    expect(response.status).toBe(400);
  });
});
