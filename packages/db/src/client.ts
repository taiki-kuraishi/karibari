import { drizzle } from "drizzle-orm/d1";

import { schemas } from "./schemas/index";

export const createMetaDb = (binding: Parameters<typeof drizzle>[0]) =>
  drizzle(binding, { schema: schemas });

export type MetaDb = ReturnType<typeof createMetaDb>;
