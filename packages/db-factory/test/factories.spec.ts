import { createMetaDb } from "@karibari/db";
import { createFactories } from "@karibari/db-factory";
import { env } from "cloudflare:workers";
import { describe, expect, test } from "vitest";

describe("@karibari/db-factory", () => {
  const db = createMetaDb(env.DB);
  const factories = createFactories(db);

  test("creates a project with overridden props", async () => {
    // Arrange
    const owner = crypto.randomUUID();
    // Act
    const project = await factories.projects
      .props({
        name: () => "demo",
        owner: () => owner,
        created_at: () => 100,
        updated_at: () => 200,
      })
      .create();
    const stored = await db.query.projects.findFirst({
      where: (table, { eq }) => eq(table.id, project.id),
    });

    // Assert
    expect(project).toStrictEqual({
      id: expect.any(String),
      name: "demo",
      owner,
      created_at: 100,
      updated_at: 200,
    });
    expect(stored).toStrictEqual(project);
  });

  test("creates a version with an associated project", async () => {
    // Arrange
    // The version factory owns its default project association.
    // Act
    const version = await factories.versions.create();
    const project = await db.query.projects.findFirst({
      where: (table, { eq }) => eq(table.id, version.project_id),
    });

    // Assert
    expect(project?.id).toBe(version.project_id);
  });

  test("creates a comment whose project matches its version", async () => {
    // Arrange
    // The comment factory owns its default project and version associations.
    // Act
    const comment = await factories.comments.create();
    const version = await db.query.versions.findFirst({
      where: (table, { eq }) => eq(table.id, comment.version_id),
    });
    const project = await db.query.projects.findFirst({
      where: (table, { eq }) => eq(table.id, comment.project_id),
    });

    // Assert
    expect(version?.project_id).toBe(comment.project_id);
    expect(project?.id).toBe(comment.project_id);
  });

  test("creates a private share with an associated project", async () => {
    // Arrange
    // The default share requires only an associated project.
    // Act
    const share = await factories.shares.create();
    const project = await db.query.projects.findFirst({
      where: (table, { eq }) => eq(table.id, share.project_id),
    });

    // Assert
    expect(share.kind).toBe("private");
    expect(share.token).toBeNull();
    expect(share.key_id).toBeNull();
    expect(project?.id).toBe(share.project_id);
  });
});
