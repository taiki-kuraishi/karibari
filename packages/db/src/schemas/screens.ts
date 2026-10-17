import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { versions } from "./versions";

export const screens = sqliteTable(
  "screens",
  {
    id: text().primaryKey(),
    version_id: text()
      .notNull()
      .references(() => versions.id, { onDelete: "cascade" }),
    name: text(),
    width: integer().notNull(),
    height: integer().notNull(),
  },
  (table) => [index("screens_version_idx").on(table.version_id)],
);
