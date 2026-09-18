import type { MetaDb } from "@karibari/db";

import { createCommentsFactory } from "./factories/comments-factory";
import { createProjectsFactory } from "./factories/projects-factory";
import { createSharesFactory } from "./factories/shares-factory";
import { createVersionsFactory } from "./factories/versions-factory";

export type { FactoryProps, FactoryReturn } from "./type";

export const createFactories = (db: MetaDb) => ({
  projects: createProjectsFactory(db),
  versions: createVersionsFactory(db),
  comments: createCommentsFactory(db),
  shares: createSharesFactory(db),
});

export type Factories = ReturnType<typeof createFactories>;

export { fk } from "./faker";
