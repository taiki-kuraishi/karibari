import type { versions } from "@karibari/db";

import { nowSeconds } from "./now-seconds";

export class VersionFactory {
  public create(args: { projectId: string }): typeof versions.$inferInsert {
    return {
      id: crypto.randomUUID(),
      project_id: args.projectId,
      created_at: nowSeconds(),
    };
  }
}
