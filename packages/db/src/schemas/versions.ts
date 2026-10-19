import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { projects } from "./projects";

export type VersionType = "canvas" | "full";

export const versions = sqliteTable(
  "versions",
  {
    id: text().primaryKey(),
    project_id: text()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: text().$type<VersionType>().notNull().default("canvas"),
    created_at: integer().notNull(),
  },
  (table) => [index("versions_project_idx").on(table.project_id)],
);
