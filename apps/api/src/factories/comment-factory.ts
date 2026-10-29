import type { CommentSource, comments } from "@karibari/db";

import { nowSeconds } from "./now-seconds";

export class CommentFactory {
  public create(args: {
    author: string;
    body: string;
    projectId: string;
    source: CommentSource;
    target: string;
    versionId: string;
  }): typeof comments.$inferInsert {
    return {
      id: crypto.randomUUID(),
      project_id: args.projectId,
      author: args.author,
      source: args.source,
      version_id: args.versionId,
      target: args.target,
      body: args.body,
      created_at: nowSeconds(),
    };
  }
}
