import type { FactoryReturn } from "@karibari/db-factory";

import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../helpers/auth-test";

describe("GET /api/projects/:project_id", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const projectTest = authTest({ path: "/api/projects/dummy-id", init: { method: "GET" } });

  type Project = FactoryReturn<"projects">;

  projectTest("200: returns the owner's project as-is", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json<{ project: Project }>();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ project });
  });

  projectTest("404: hides a foreign owner's project", async ({ auth }) => {
    // Arrange
    const foreign = await factories.projects
      .props({
        name: () => "foreign",
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${foreign.id}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  projectTest("404: returns not_found for a missing project", async ({ auth }) => {
    // Arrange
    const missingId = crypto.randomUUID();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${missingId}`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });
});
