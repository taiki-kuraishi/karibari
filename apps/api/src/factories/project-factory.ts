import type { projects, versions } from "@karibari/db";

export class ProjectFactory {
  public create(args: { name: string | null; owner: string }): {
    project: typeof projects.$inferInsert;
    version: typeof versions.$inferInsert;
  } {
    const projectId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    // Unix seconds, matching the `exp` unit used by signed URLs.
    const createdAt = Math.floor(Date.now() / 1000);

    return {
      project: {
        id: projectId,
        name: args.name,
        owner: args.owner,
        created_at: createdAt,
        updated_at: createdAt,
      },
      version: { id: versionId, project_id: projectId, created_at: createdAt },
    };
  }
}
