import type { schemas } from "@karibari/db";

type Schemas = typeof schemas;

export type FactoryProps<T extends keyof Schemas> = Schemas[T]["$inferInsert"];
export type FactoryReturn<T extends keyof Schemas> = Schemas[T]["$inferSelect"];
