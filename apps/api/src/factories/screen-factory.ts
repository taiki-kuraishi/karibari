import type { screens } from "@karibari/db";

export class ScreenFactory {
  public create(args: {
    height: number;
    name: string | null;
    versionId: string;
    width: number;
  }): typeof screens.$inferInsert {
    return {
      id: crypto.randomUUID(),
      version_id: args.versionId,
      name: args.name,
      width: args.width,
      height: args.height,
    };
  }
}
