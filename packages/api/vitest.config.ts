import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Vitest reads the same wrangler.jsonc used for deploy.
// There is no separate test config, so the test bundle matches the deploy bundle.
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
  test: { testTimeout: 30_000, silent: "passed-only" },
});
