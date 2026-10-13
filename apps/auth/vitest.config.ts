import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

const authMigrations = await readD1Migrations(
  path.join(import.meta.dirname, "../../packages/better-auth/src/migrations"),
);

// Vitest reads the same wrangler.jsonc used for deploy.
// There is no separate test config, so the test bundle matches the deploy bundle.
// VRT (test/vrt/**) and E2E (test/e2e/**) are Playwright suites; keep both out of the unit run.
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: { bindings: { TEST_AUTH_MIGRATIONS: authMigrations } },
    }),
  ],
  test: {
    exclude: [...configDefaults.exclude, "test/vrt/**", "test/e2e/**"],
    setupFiles: ["./test/apply-migrations.ts"],
    testTimeout: 30_000,
    silent: "passed-only",
  },
});
