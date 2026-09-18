import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import path from "node:path";
import { defineConfig } from "vitest/config";

const migrations = await readD1Migrations(
  path.join(import.meta.dirname, "../../packages/db/src/migrations"),
);
const authMigrations = await readD1Migrations(
  path.join(import.meta.dirname, "../../packages/better-auth/src/migrations"),
);

// Vitest reads the same wrangler.jsonc used for deploy.
// There is no separate test config, so the test bundle matches the deploy bundle.
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: migrations,
          TEST_AUTH_MIGRATIONS: authMigrations,
        },
        d1Databases: ["DB", "AUTH_DB"],
      },
    }),
  ],
  test: {
    testTimeout: 30_000,
    silent: "passed-only",
    setupFiles: ["./test/apply-migrations.ts"],
  },
});
