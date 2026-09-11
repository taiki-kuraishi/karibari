import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { projects } from "./projects";

export const versions = sqliteTable(
  "versions",
  {
    id: text().primaryKey(),
    project_id: text()
      .notNull()
      .references(() => projects.id),
    created_at: integer().notNull(),
  },
  (table) => [index("versions_project_idx").on(table.project_id)],
);
