import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../../../../../helpers/auth-test";

describe("PATCH /api/projects/:project_id/versions/:version_id/comments/:comment_id/resolution", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const resolutionTest = authTest({
    path: "/api/projects/dummy-id/versions/dummy-vid/comments/dummy-cid/resolution",
    init: {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resolved: true }),
    },
  });

  const patchResolution = async (args: { body: unknown; headers: Headers; path: string }) => {
    const headers = new Headers(args.headers);
    headers.set("content-type", "application/json");

    return await exports.default.fetch(
      new Request(`http://api${args.path}/resolution`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(args.body),
      }),
    );
  };

  resolutionTest("200: resolves a thread root, including an MCP-written one", async ({ auth }) => {
    // Arrange
    const project = await factories.projects.props({ owner: () => auth.userId }).create();
    const version = await factories.versions.props({ project_id: () => project.id }).create();
    const root = await factories.comments
      .props({ version_id: () => version.id, source: () => "mcp" as const })
      .create();

    // Act
    const response = await patchResolution({
      headers: auth.headers,
      path: `/api/projects/${project.id}/versions/${version.id}/comments/${root.id}`,
      body: { resolved: true },
    });

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({
      comment: { ...root, resolved_at: expect.any(Number) },
    });
  });

  resolutionTest("200: reopens a resolved thread", async ({ auth }) => {
    // Arrange
    const project = await factories.projects.props({ owner: () => auth.userId }).create();
    const version = await factories.versions.props({ project_id: () => project.id }).create();
    const root = await factories.comments
      .props({ version_id: () => version.id, resolved_at: () => 1_800_000_000 })
      .create();

    // Act
    const response = await patchResolution({
      headers: auth.headers,
      path: `/api/projects/${project.id}/versions/${version.id}/comments/${root.id}`,
      body: { resolved: false },
    });

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ comment: { ...root, resolved_at: null } });
  });

  resolutionTest("400: rejects resolving a reply", async ({ auth }) => {
    // Arrange
    const project = await factories.projects.props({ owner: () => auth.userId }).create();
    const version = await factories.versions.props({ project_id: () => project.id }).create();
    const root = await factories.comments.props({ version_id: () => version.id }).create();
    const reply = await factories.comments
      .props({ version_id: () => version.id, parent_id: () => root.id })
      .create();

    // Act
    const response = await patchResolution({
      headers: auth.headers,
      path: `/api/projects/${project.id}/versions/${version.id}/comments/${reply.id}`,
      body: { resolved: true },
    });

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({ error: "not_thread_root" });
  });

  resolutionTest("404: hides a foreign owner's comment", async ({ auth }) => {
    // Arrange
    const root = await factories.comments.create();

    // Act
    const response = await patchResolution({
      headers: auth.headers,
      path: `/api/projects/${root.project_id}/versions/${root.version_id}/comments/${root.id}`,
      body: { resolved: true },
    });

    // Assert
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
  });
});
