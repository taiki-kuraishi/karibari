import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schemas/*",
  out: "./src/migrations",
  casing: "snake_case",
  migrations: { prefix: "timestamp" },
});
