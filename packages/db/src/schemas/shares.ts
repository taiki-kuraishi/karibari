import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { projects } from "./projects";

export type ShareKind = "private" | "invite" | "signed";

export const shares = sqliteTable(
  "shares",
  {
    id: text().primaryKey(),
    project_id: text()
      .notNull()
      .references(() => projects.id),
    kind: text().$type<ShareKind>().notNull(),
    token: text(),
    key_id: text(),
  },
  (table) => [
    index("shares_project_idx").on(table.project_id),
    uniqueIndex("shares_token_idx").on(table.token),
  ],
);
