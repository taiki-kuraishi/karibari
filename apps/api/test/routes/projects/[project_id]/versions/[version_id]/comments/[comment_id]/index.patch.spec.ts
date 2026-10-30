import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../../../../../helpers/auth-test";

describe("PATCH /api/projects/:project_id/versions/:version_id/comments/:comment_id", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const editTest = authTest({
    path: "/api/projects/dummy-id/versions/dummy-vid/comments/dummy-cid",
    init: {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "protected" }),
    },
  });

  const patchComment = async (args: { body: unknown; headers: Headers; path: string }) => {
    const headers = new Headers(args.headers);
    headers.set("content-type", "application/json");

    return await exports.default.fetch(
      new Request(`http://api${args.path}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(args.body),
      }),
    );
  };

  editTest("200: edits the owner's viewer comment and stamps updated_at", async ({ auth }) => {
    // Arrange
    const project = await factories.projects.props({ owner: () => auth.userId }).create();
    const version = await factories.versions.props({ project_id: () => project.id }).create();
    const comment = await factories.comments
      .props({
        version_id: () => version.id,
        author: () => auth.userId,
        source: () => "viewer" as const,
      })
      .create();

    // Act
    const response = await patchComment({
      headers: auth.headers,
      path: `/api/projects/${project.id}/versions/${version.id}/comments/${comment.id}`,
      body: { body: "Edited" },
    });

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({
      comment: { ...comment, body: "Edited", updated_at: expect.any(Number) },
    });
  });

  editTest("404: keeps an MCP-written comment read-only from the viewer", async ({ auth }) => {
    // Arrange
    const project = await factories.projects.props({ owner: () => auth.userId }).create();
    const version = await factories.versions.props({ project_id: () => project.id }).create();
    const comment = await factories.comments
      .props({
        version_id: () => version.id,
        author: () => auth.userId,
        source: () => "mcp" as const,
      })
      .create();

    // Act
    const response = await patchComment({
      headers: auth.headers,
      path: `/api/projects/${project.id}/versions/${version.id}/comments/${comment.id}`,
      body: { body: "Edited" },
    });

    // Assert
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
  });

  editTest("404: hides a foreign owner's comment", async ({ auth }) => {
    // Arrange
    const comment = await factories.comments.create();

    // Act
    const response = await patchComment({
      headers: auth.headers,
      path: `/api/projects/${comment.project_id}/versions/${comment.version_id}/comments/${comment.id}`,
      body: { body: "Edited" },
    });

    // Assert
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
  });

  editTest("404: rejects the owner's comment from another version", async ({ auth }) => {
    // Arrange
    const project = await factories.projects.props({ owner: () => auth.userId }).create();
    const version = await factories.versions.props({ project_id: () => project.id }).create();
    const other = await factories.versions.props({ project_id: () => project.id }).create();
    const comment = await factories.comments
      .props({
        version_id: () => other.id,
        author: () => auth.userId,
        source: () => "viewer" as const,
      })
      .create();

    // Act
    const response = await patchComment({
      headers: auth.headers,
      path: `/api/projects/${project.id}/versions/${version.id}/comments/${comment.id}`,
      body: { body: "Edited" },
    });

    // Assert
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
  });
});
