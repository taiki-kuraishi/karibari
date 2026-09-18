import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env, exports } from "cloudflare:workers";
import { describe, expect } from "vitest";

import { authTest } from "../../../../../helpers/auth-test";

describe("DELETE /api/projects/:project_id/shares/:share_id", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);
  const shareTest = authTest({
    path: "/api/projects/dummy-id/shares/dummy-sid",
    init: { method: "DELETE" },
  });

  shareTest("200: revokes the owner's share", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();
    const share = await factories.shares
      .props({
        project_id: () => project.id,
        kind: () => "invite",
        token: () => "token-a",
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/shares/${share.id}`, {
        method: "DELETE",
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();
    const revoked = await db.query.shares.findFirst({
      where: (table, { eq }) => eq(table.id, share.id),
    });

    // Assert
    expect(response.status).toBe(200);
    expect(body).toStrictEqual({ deleted: true });
    expect(revoked).toBeUndefined();
  });

  shareTest("404: hides a foreign owner's share without deleting", async ({ auth }) => {
    // Arrange
    const foreign = await factories.projects
      .props({
        name: () => "foreign",
      })
      .create();
    const share = await factories.shares
      .props({
        project_id: () => foreign.id,
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${foreign.id}/shares/${share.id}`, {
        method: "DELETE",
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();
    const kept = await db.query.shares.findFirst({
      where: (table, { eq }) => eq(table.id, share.id),
    });

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
    expect(kept?.id).toBe(share.id);
  });

  shareTest("404: returns not_found for a missing project", async ({ auth }) => {
    // Arrange
    const missingId = crypto.randomUUID();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${missingId}/shares/${crypto.randomUUID()}`, {
        method: "DELETE",
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
  });

  shareTest("404: returns not_found for a share of another project", async ({ auth }) => {
    // Arrange
    const project = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "demo",
      })
      .create();
    const other = await factories.projects
      .props({
        owner: () => auth.userId,
        name: () => "other",
      })
      .create();
    const otherShare = await factories.shares
      .props({
        project_id: () => other.id,
      })
      .create();

    // Act
    const response = await exports.default.fetch(
      new Request(`http://api/api/projects/${project.id}/shares/${otherShare.id}`, {
        method: "DELETE",
        headers: new Headers(auth.headers),
      }),
    );
    const body = await response.json();
    const kept = await db.query.shares.findFirst({
      where: (table, { eq }) => eq(table.id, otherShare.id),
    });

    // Assert
    expect(response.status).toBe(404);
    expect(body).toStrictEqual({ error: "not_found" });
    expect(kept?.id).toBe(otherShare.id);
  });
});
