import type { FactoryReturn } from "@karibari/db-factory";

import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../helpers/auth-test";

describe("GET /api/projects", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const projectsTest = authTest({ path: "/api/projects", init: { method: "GET" } });

  type Project = FactoryReturn<"projects">;

  projectsTest(
    "200: returns only the owner's projects by most recently updated",
    async ({ auth }) => {
      // Arrange
      const older = await factories.projects
        .props({
          name: () => "older",
          owner: () => auth.userId,
          created_at: () => 100,
          updated_at: () => 100,
        })
        .create();
      const newer = await factories.projects
        .props({
          name: () => "newer",
          owner: () => auth.userId,
          created_at: () => 200,
          updated_at: () => 300,
        })
        .create();
      await factories.projects
        .props({
          name: () => "foreign",
          created_at: () => 400,
          updated_at: () => 400,
        })
        .create();

      // Act
      const response = await exports.default.fetch(
        new Request("http://api/api/projects", { headers: new Headers(auth.headers) }),
      );
      const body = await response.json<{ projects: Project[] }>();

      // Assert
      expect(response.status).toBe(200);
      expect(body).toStrictEqual({ projects: [newer, older] });
    },
  );

  projectsTest("200: returns an empty list when the owner has no projects", async ({ auth }) => {
    // Arrange
    // This fixture uses a unique user id and has no project rows.
    // Act
    const response = await exports.default.fetch(
      new Request("http://api/api/projects", { headers: new Headers(auth.headers) }),
    );
    const body = await response.json<{ projects: Project[] }>();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ projects: [] });
  });
});
