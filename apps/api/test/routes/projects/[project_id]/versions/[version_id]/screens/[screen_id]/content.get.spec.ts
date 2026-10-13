import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../../../../../helpers/auth-test";

describe("GET /api/projects/:project_id/versions/:version_id/screens/:screen_id/content", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const contentTest = authTest({
    path: "/api/projects/dummy-id/versions/dummy-vid/screens/dummy-sid/content",
    init: { method: "GET" },
  });

  contentTest("200: returns the owner's screen HTML as stored", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
      })
      .create();
    const version = await factories.versions
      .props({
        project_id: () => project.id,
      })
      .create();
    const screen = await factories.screens
      .props({
        version_id: () => version.id,
      })
      .create();
    const html = "<p>hi</p>";
    await env.HTML_BUCKET.put(
      `projects/${project.id}/versions/${version.id}/screens/${screen.id}.html`,
      html,
    );

    // Act
    const response = await exports.default.fetch(
      new Request(
        `http://api/api/projects/${project.id}/versions/${version.id}/screens/${screen.id}/content`,
        { headers: new Headers(auth.headers) },
      ),
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-security-policy")).toBe("sandbox allow-scripts");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe(html);
  });

  contentTest("404: hides a foreign owner's screen", async ({ auth }) => {
    // Arrange
    const foreign = await factories.projects.create();
    const version = await factories.versions
      .props({
        project_id: () => foreign.id,
      })
      .create();
    const screen = await factories.screens
      .props({
        version_id: () => version.id,
      })
      .create();
    await env.HTML_BUCKET.put(
      `projects/${foreign.id}/versions/${version.id}/screens/${screen.id}.html`,
      "<p>foreign</p>",
    );

    // Act
    const response = await exports.default.fetch(
      new Request(
        `http://api/api/projects/${foreign.id}/versions/${version.id}/screens/${screen.id}/content`,
        { headers: new Headers(auth.headers) },
      ),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  contentTest("404: hides a screen that belongs to another version", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
      })
      .create();
    const version = await factories.versions
      .props({
        project_id: () => project.id,
      })
      .create();
    const otherVersion = await factories.versions
      .props({
        project_id: () => project.id,
      })
      .create();
    const screen = await factories.screens
      .props({
        version_id: () => otherVersion.id,
      })
      .create();
    // The object sits under the requested version, so only the D1 row can reject it.
    await env.HTML_BUCKET.put(
      `projects/${project.id}/versions/${version.id}/screens/${screen.id}.html`,
      "<p>misplaced</p>",
    );

    // Act
    const response = await exports.default.fetch(
      new Request(
        `http://api/api/projects/${project.id}/versions/${version.id}/screens/${screen.id}/content`,
        { headers: new Headers(auth.headers) },
      ),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  contentTest("404: returns not_found when the HTML object is missing", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
      })
      .create();
    const version = await factories.versions
      .props({
        project_id: () => project.id,
      })
      .create();
    const screen = await factories.screens
      .props({
        version_id: () => version.id,
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(
        `http://api/api/projects/${project.id}/versions/${version.id}/screens/${screen.id}/content`,
        { headers: new Headers(auth.headers) },
      ),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });
});
