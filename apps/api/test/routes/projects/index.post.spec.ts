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
      body: JSON.stringify({ screens: [{ html: "<p>protected</p>" }] }),
    },
  });

  projectTest(
    "201: stores a canvas version's screens in D1 and each screen's HTML in R2",
    async ({ auth }) => {
      // Arrange
      const screens = [
        { html: "<p>top</p>", name: " top ", width: 390, height: 2400 },
        { html: "<p>detail</p>" },
      ];
      // Act
      const response = await createProject({ name: " demo ", screens }, auth.headers);
      const body = await response.json<{ projectId: string; versionId: string; url: string }>();
      const project = await db.query.projects.findFirst({
        columns: { name: true, owner: true },
        where: (table, { eq }) => eq(table.id, body.projectId),
      });
      const version = await db.query.versions.findFirst({
        columns: { project_id: true, type: true },
        where: (table, { eq }) => eq(table.id, body.versionId),
      });
      const stored = await db.query.screens.findMany({
        where: (table, { eq }) => eq(table.version_id, body.versionId),
        orderBy: (_table, { asc, sql }) => [asc(sql`rowid`)],
      });
      const htmls = await Promise.all(
        stored.map(async (screen) => {
          const object = await env.HTML_BUCKET.get(
            `projects/${body.projectId}/versions/${body.versionId}/screens/${screen.id}.html`,
          );

          return await object?.text();
        }),
      );

      // Assert
      expect(response.status).toBe(201);
      expect(body.url).toBe(`https://app.karibari.com/p/${body.projectId}`);
      expect(project).toStrictEqual({ name: "demo", owner: auth.userId });
      expect(version).toStrictEqual({ project_id: body.projectId, type: "canvas" });
      expect(stored).toStrictEqual([
        {
          id: expect.any(String),
          version_id: body.versionId,
          name: "top",
          width: 390,
          height: 2400,
        },
        {
          id: expect.any(String),
          version_id: body.versionId,
          name: null,
          width: 1440,
          height: 900,
        },
      ]);
      expect(htmls).toStrictEqual(["<p>top</p>", "<p>detail</p>"]);
    },
  );

  projectTest("201: stores a full version with its single screen", async ({ auth }) => {
    // Arrange
    const screens = [{ html: "<p>app</p>" }];
    // Act
    const response = await createProject({ type: "full", screens }, auth.headers);
    const body = await response.json<{ versionId: string }>();
    const version = await db.query.versions.findFirst({
      columns: { type: true },
      where: (table, { eq }) => eq(table.id, body.versionId),
    });
    const stored = await db.query.screens.findMany({
      columns: { width: true, height: true },
      where: (table, { eq }) => eq(table.version_id, body.versionId),
    });

    // Assert
    expect(response.status).toBe(201);
    expect(version).toStrictEqual({ type: "full" });
    expect(stored).toStrictEqual([{ width: 1440, height: 900 }]);
  });

  projectTest("201: accepts an omitted name as null", async ({ auth }) => {
    // Arrange
    const screens = [{ html: "<p>hi</p>" }];
    // Act
    const response = await createProject({ screens }, auth.headers);
    const body = await response.json<{ projectId: string }>();
    const project = await db.query.projects.findFirst({
      columns: { name: true },
      where: (table, { eq }) => eq(table.id, body.projectId),
    });

    // Assert
    expect(response.status).toBe(201);
    expect(project).toStrictEqual({ name: null });
  });

  projectTest("201: accepts 20 screens at the width and height bounds", async ({ auth }) => {
    // Arrange
    const screens = Array.from({ length: 20 }, (_value, index) => ({
      html: `<p>${index}</p>`,
      width: index === 0 ? 320 : 3840,
      height: index === 0 ? 200 : 20_000,
    }));
    // Act
    const response = await createProject({ screens }, auth.headers);
    const body = await response.json<{ versionId: string }>();
    const stored = await db.query.screens.findMany({
      columns: { width: true, height: true },
      where: (table, { eq }) => eq(table.version_id, body.versionId),
      orderBy: (_table, { asc, sql }) => [asc(sql`rowid`)],
    });

    // Assert
    expect(response.status).toBe(201);
    expect(stored).toStrictEqual(screens.map(({ width, height }) => ({ width, height })));
  });

  projectTest("400: rejects malformed bodies with validation issues", async ({ auth }) => {
    // Arrange
    const screen = { html: "<p>hi</p>" };
    const invalidBodies = [
      {},
      { html: "<p>hi</p>" },
      { screens: [] },
      { screens: Array.from({ length: 21 }, () => screen) },
      { screens: [{ html: "" }] },
      { screens: [{ html: 42 }] },
      { screens: [{ ...screen, width: 319 }] },
      { screens: [{ ...screen, width: 3841 }] },
      { screens: [{ ...screen, width: 1440.5 }] },
      { screens: [{ ...screen, height: 199 }] },
      { screens: [{ ...screen, height: 20_001 }] },
      { screens: [{ ...screen, height: 900.5 }] },
      { type: "page", screens: [screen] },
      { type: "full", screens: [] },
      { type: "full", screens: [screen, screen] },
    ];
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
  });
});
