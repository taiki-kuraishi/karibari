import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { configDefaults, defineConfig } from "vitest/config";

// Vitest reads the same wrangler.jsonc used for deploy.
// There is no separate test config, so the test bundle matches the deploy bundle.
// VRT (test/vrt/**) and E2E (test/e2e/**) are Playwright suites; keep both out of the unit run.
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
  test: {
    exclude: [...configDefaults.exclude, "test/vrt/**", "test/e2e/**"],
    testTimeout: 30_000,
    silent: "passed-only",
  },
});
