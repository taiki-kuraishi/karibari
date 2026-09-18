import type { projects, versions } from "@karibari/db";

import { nowSeconds } from "./now-seconds";
import { VersionFactory } from "./version-factory";

export class ProjectFactory {
  private readonly versionFactory: VersionFactory;

  public constructor(versionFactory: VersionFactory = new VersionFactory()) {
    this.versionFactory = versionFactory;
  }

  public create(args: { name: string | null; owner: string }): {
    project: typeof projects.$inferInsert;
    version: typeof versions.$inferInsert;
  } {
    const projectId = crypto.randomUUID();
    const createdAt = nowSeconds();

    return {
      project: {
        id: projectId,
        name: args.name,
        owner: args.owner,
        created_at: createdAt,
        updated_at: createdAt,
      },
      version: this.versionFactory.create({ projectId }),
    };
  }
}
