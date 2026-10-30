import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../../../../../helpers/auth-test";

describe("DELETE /api/projects/:project_id/versions/:version_id/comments/:comment_id", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const deleteTest = authTest({
    path: "/api/projects/dummy-id/versions/dummy-vid/comments/dummy-cid",
    init: { method: "DELETE" },
  });

  deleteTest("200: deletes a thread root together with its replies", async ({ auth }) => {
    // Arrange
    const project = await factories.projects.props({ owner: () => auth.userId }).create();
    const version = await factories.versions.props({ project_id: () => project.id }).create();
    const root = await factories.comments.props({ version_id: () => version.id }).create();
    await factories.comments
      .props({ version_id: () => version.id, parent_id: () => root.id })
      .create();
    const sibling = await factories.comments.props({ version_id: () => version.id }).create();

    // Act
    const response = await exports.default.fetch(
      new Request(
        `http://api/api/projects/${project.id}/versions/${version.id}/comments/${root.id}`,
        { method: "DELETE", headers: auth.headers },
      ),
    );
    const remaining = await db.query.comments.findMany({
      columns: { id: true },
      where: (table, { eq }) => eq(table.version_id, version.id),
    });

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ deleted: true });
    expect(remaining).toStrictEqual([{ id: sibling.id }]);
  });

  deleteTest("404: hides a foreign owner's comment", async ({ auth }) => {
    // Arrange
    const comment = await factories.comments.create();

    // Act
    const response = await exports.default.fetch(
      new Request(
        `http://api/api/projects/${comment.project_id}/versions/${comment.version_id}/comments/${comment.id}`,
        { method: "DELETE", headers: auth.headers },
      ),
    );

    // Assert
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
  });

  deleteTest("404: rejects a comment from another version", async ({ auth }) => {
    // Arrange
    const project = await factories.projects.props({ owner: () => auth.userId }).create();
    const version = await factories.versions.props({ project_id: () => project.id }).create();
    const other = await factories.versions.props({ project_id: () => project.id }).create();
    const comment = await factories.comments.props({ version_id: () => other.id }).create();

    // Act
    const response = await exports.default.fetch(
      new Request(
        `http://api/api/projects/${project.id}/versions/${version.id}/comments/${comment.id}`,
        { method: "DELETE", headers: auth.headers },
      ),
    );

    // Assert
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "not_found" });
  });
});
