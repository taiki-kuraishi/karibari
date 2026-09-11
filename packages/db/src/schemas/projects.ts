import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text().primaryKey(),
  name: text(),
  owner: text().notNull(),
  created_at: integer().notNull(),
  updated_at: integer().notNull(),
});
