import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { projects } from "./projects";
import { versions } from "./versions";

export const comments = sqliteTable(
  "comments",
  {
    id: text().primaryKey(),
    project_id: text()
      .notNull()
      .references(() => projects.id),
    version_id: text()
      .notNull()
      .references(() => versions.id),
    target: text().notNull(),
    body: text().notNull(),
    created_at: integer().notNull(),
  },
  (table) => [index("comments_project_version_idx").on(table.project_id, table.version_id)],
);
