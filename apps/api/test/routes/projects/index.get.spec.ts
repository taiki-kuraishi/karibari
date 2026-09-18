import { createMetaDb, projects } from "@karibari/db";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../helpers/auth-test";

describe("GET /api/projects", () => {
  const db = createMetaDb(env.DB);
  const projectsTest = authTest({ path: "/api/projects", init: { method: "GET" } });

  type Project = typeof projects.$inferSelect;

  projectsTest(
    "200: returns only the owner's projects by most recently updated",
    async ({ auth }) => {
      // Arrange
      const older = {
        id: crypto.randomUUID(),
        name: "older",
        owner: auth.userId,
        created_at: 100,
        updated_at: 100,
      } satisfies Project;
      const newer = {
        id: crypto.randomUUID(),
        name: "newer",
        owner: auth.userId,
        created_at: 200,
        updated_at: 300,
      } satisfies Project;
      const foreign = {
        id: crypto.randomUUID(),
        name: "foreign",
        owner: crypto.randomUUID(),
        created_at: 400,
        updated_at: 400,
      } satisfies Project;
      await db.insert(projects).values([older, newer, foreign]);

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
