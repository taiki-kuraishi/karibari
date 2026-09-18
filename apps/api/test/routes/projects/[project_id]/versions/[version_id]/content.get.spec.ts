import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../../../helpers/auth-test";

describe("GET /api/projects/:project_id/versions/:version_id/content", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const contentTest = authTest({
    path: "/api/projects/dummy-id/versions/dummy-vid/content",
    init: { method: "GET" },
  });

  contentTest("200: returns the owner's version HTML", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();
    const version = await factories.versions
      .props({
        project_id: () => project.id,
      })
      .create();
    const html = "<p>hi</p>";
    await env.HTML_BUCKET.put(`projects/${project.id}/versions/${version.id}/index.html`, html);

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/versions/${version.id}/content`, {
        headers: new Headers(auth.headers),
      }),
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toBe(html);
  });

  contentTest("404: hides a foreign owner's content", async ({ auth }) => {
    // Arrange
    const foreign = await factories.projects
      .props({
        name: () => "foreign",
      })
      .create();
    const version = await factories.versions
      .props({
        project_id: () => foreign.id,
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${foreign.id}/versions/${version.id}/content`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  contentTest("404: returns not_found for a missing version", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/versions/${crypto.randomUUID()}/content`, {
        headers: new Headers(auth.headers),
      }),
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
        name: () => "demo",
      })
      .create();
    const version = await factories.versions
      .props({
        project_id: () => project.id,
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/versions/${version.id}/content`, {
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });
});
