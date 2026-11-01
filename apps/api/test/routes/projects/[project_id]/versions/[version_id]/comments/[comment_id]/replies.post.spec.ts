import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../../../../../helpers/auth-test";

describe("POST /api/projects/:project_id/versions/:version_id/comments/:comment_id/replies", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const repliesTest = authTest({
    path: "/api/projects/dummy-id/versions/dummy-vid/comments/dummy-cid/replies",
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "protected" }),
    },
  });

  const postReply = async (args: { headers: Headers; path: string }) => {
    const headers = new Headers(args.headers);
    headers.set("content-type", "application/json");

    return await exports.default.fetch(
      new Request(`http://api${args.path}/replies`, {
        method: "POST",
        headers,
        body: JSON.stringify({ body: "Agreed" }),
      }),
    );
  };

  repliesTest(
    "201: replies under the thread root and inherits its screen and target",
    async ({ auth }) => {
      // Arrange
      const project = await factories.projects.props({ owner: () => auth.userId }).create();
      const version = await factories.versions.props({ project_id: () => project.id }).create();
      const screen = await factories.screens.props({ version_id: () => version.id }).create();
      const root = await factories.comments
        .props({ version_id: () => version.id, screen_id: () => screen.id, target: () => "#hero" })
        .create();

      // Act
      const response = await postReply({
        headers: auth.headers,
        path: `/api/projects/${project.id}/versions/${version.id}/comments/${root.id}`,
      });
      const body = await response.json<{ commentId: string }>();
      const reply = await db.query.comments.findFirst({
        columns: {
          parent_id: true,
          screen_id: true,
          target: true,
          body: true,
          author: true,
          source: true,
        },
        where: (table, { eq }) => eq(table.id, body.commentId),
      });

      // Assert
      expect(response.status).toBe(201);
      expect(reply).toStrictEqual({
        parent_id: root.id,
        screen_id: screen.id,
        target: "#hero",
        body: "Agreed",
        author: auth.userId,
        source: "viewer",
      });
    },
  );

  repliesTest("400: rejects a reply to a reply", async ({ auth }) => {
    // Arrange
    const project = await factories.projects.props({ owner: () => auth.userId }).create();
    const version = await factories.versions.props({ project_id: () => project.id }).create();
    const root = await factories.comments.props({ version_id: () => version.id }).create();
    const reply = await factories.comments
      .props({ version_id: () => version.id, parent_id: () => root.id })
      .create();

    // Act
    const response = await postReply({
      headers: auth.headers,
      path: `/api/projects/${project.id}/versions/${version.id}/comments/${reply.id}`,
    });

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({ error: "not_thread_root" });
  });

  repliesTest("404: hides a foreign owner's comment", async ({ auth }) => {
    // Arrange
    const root = await factories.comments.create();

    // Act
    const response = await postReply({
      headers: auth.headers,
      path: `/api/projects/${root.project_id}/versions/${root.version_id}/comments/${root.id}`,
    });

    // Assert
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
  });

  repliesTest("404: rejects a comment from another version", async ({ auth }) => {
    // Arrange
    const project = await factories.projects.props({ owner: () => auth.userId }).create();
    const version = await factories.versions.props({ project_id: () => project.id }).create();
    const other = await factories.versions.props({ project_id: () => project.id }).create();
    const root = await factories.comments.props({ version_id: () => other.id }).create();

    // Act
    const response = await postReply({
      headers: auth.headers,
      path: `/api/projects/${project.id}/versions/${version.id}/comments/${root.id}`,
    });

    // Assert
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
  });
});
