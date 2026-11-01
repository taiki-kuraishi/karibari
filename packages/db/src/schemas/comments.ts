import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { projects } from "./projects";
import { screens } from "./screens";
import { versions } from "./versions";

export type CommentSource = "mcp" | "viewer";

export const comments = sqliteTable(
  "comments",
  {
    id: text().primaryKey(),
    project_id: text()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    version_id: text()
      .notNull()
      .references(() => versions.id, { onDelete: "cascade" }),
    parent_id: text().references((): AnySQLiteColumn => comments.id, { onDelete: "cascade" }),
    // Null for comments written before screens were tracked. No `onDelete`: screens only go away with
    // Their version, whose cascade already removes the comment, and drizzle-kit's generated
    // ALTER TABLE ADD drops an `ON DELETE` clause anyway.
    screen_id: text().references(() => screens.id),
    author: text().notNull(),
    source: text().$type<CommentSource>().notNull(),
    target: text().notNull(),
    body: text().notNull(),
    created_at: integer().notNull(),
    updated_at: integer(),
    resolved_at: integer(),
  },
  (table) => [index("comments_project_version_idx").on(table.project_id, table.version_id)],
);
