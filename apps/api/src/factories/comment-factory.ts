import type { comments } from "@karibari/db";

import { nowSeconds } from "./now-seconds";

export class CommentFactory {
  public create(args: {
    body: string;
    projectId: string;
    target: string;
    versionId: string;
  }): typeof comments.$inferInsert {
    return {
      id: crypto.randomUUID(),
      project_id: args.projectId,
      version_id: args.versionId,
      target: args.target,
      body: args.body,
      created_at: nowSeconds(),
    };
  }
}
