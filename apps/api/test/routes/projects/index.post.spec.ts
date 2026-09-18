import { createMetaDb } from "@karibari/db";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../helpers/auth-test";

const db = createMetaDb(env.DB);
const createProject = async (body: Record<string, unknown>, authHeaders: Headers) => {
  const headers = new Headers(authHeaders);
  headers.set("content-type", "application/json");

  return exports.default.fetch(
    new Request("http://api/api/projects", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
};

describe("POST /api/projects", () => {
  const projectTest = authTest({
    path: "/api/projects",
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ html: "<p>protected</p>" }),
    },
  });

  projectTest("201: stores project meta in D1 and HTML in R2", async ({ auth }) => {
    // Arrange
    const name = " demo ";
    // Act
    const response = await createProject({ html: "<p>hi</p>", name }, auth.headers);
    const body = await response.json<{ projectId: string; versionId: string; url: string }>();
    const project = await db.query.projects.findFirst({
      columns: { name: true, owner: true },
      where: (table, { eq }) => eq(table.id, body.projectId),
    });
    const version = await db.query.versions.findFirst({
      columns: { project_id: true },
      where: (table, { eq }) => eq(table.id, body.versionId),
    });
    const html = await env.HTML_BUCKET.get(
      `projects/${body.projectId}/versions/${body.versionId}/index.html`,
    );

    // Assert
    expect(response.status).toBe(201);
    expect(body.url).toBe(`/p/${body.projectId}`);
    expect(project).toStrictEqual({ name: "demo", owner: auth.userId });
    expect(version).toStrictEqual({ project_id: body.projectId });
    expect(await html?.text()).toBe("<p>hi</p>");
  });

  projectTest("201: accepts an omitted name as null", async ({ auth }) => {
    // Arrange
    const html = "<p>hi</p>";
    // Act
    const response = await createProject({ html }, auth.headers);
    const body = await response.json<{ projectId: string }>();
    const project = await db.query.projects.findFirst({
      columns: { name: true },
      where: (table, { eq }) => eq(table.id, body.projectId),
    });

    // Assert
    expect(response.status).toBe(201);
    expect(project).toStrictEqual({ name: null });
  });

  projectTest(
    "400: rejects empty, missing, or non-string html with validation issues",
    async ({ auth }) => {
      // Arrange
      const invalidBodies = [{}, { html: "" }, { html: 42 }];
      // Act
      const responses = await Promise.all(
        invalidBodies.map(async (body) => await createProject(body, auth.headers)),
      );
      const responseBodies = await Promise.all(
        responses.map(async (response) => await response.json()),
      );

      // Assert
      for (const response of responses) {
        expect(response.status).toBe(400);
      }
      for (const body of responseBodies) {
        expect(body).toStrictEqual({ cause: expect.any(Array) });
      }
    },
  );
});
