import type { VersionType, versions } from "@karibari/db";

import { nowSeconds } from "./now-seconds";

export class VersionFactory {
  public create(args: { projectId: string; type: VersionType }): typeof versions.$inferInsert {
    return {
      id: crypto.randomUUID(),
      project_id: args.projectId,
      type: args.type,
      created_at: nowSeconds(),
    };
  }
}
