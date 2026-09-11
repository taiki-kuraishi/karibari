import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/auth-schema.ts",
  out: "./src/migrations",
  casing: "snake_case",
  migrations: { prefix: "timestamp" },
});
