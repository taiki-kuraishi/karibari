import type { KnipConfig } from "knip";

export default {
  bun: { config: ["package.json"] },
  entry: [],
  ignore: [],
  project: [],
  // One entry per workspace package.
  // Every workspace added to `workspaces.packages` needs a matching entry here.
  // See .claude/rules/workspace-packages.md.
  workspaces: {
    ".": {},
    // Knip only special-cases the `node:` protocol, so a Worker importing
    // `cloudflare:workers` reads as a dependency literally named `cloudflare`.
    "apps/remote-mcp": { ignoreDependencies: ["cloudflare"] },
    "apps/api": { ignoreDependencies: ["cloudflare"] },
    // The Playwright plugin is off because loading `vrt.playwright.config.ts` throws without
    // `PW_TEST_CONNECT_WS_ENDPOINT` (VRT must run against the Docker browser server).
    // Narrowing `playwright.config` cannot avoid it: knip also picks up config files from the
    // `--config` flag in this package's scripts and loads them regardless.
    // With the plugin off, both configs are parsed as plain entries and nothing reads their
    // `testDir` or `globalSetup`, so those inputs are listed by hand below.
    // Update `entry` whenever either config changes them.
    "apps/auth": {
      ignoreDependencies: ["cloudflare"],
      entry: ["test/e2e/global-setup.ts", "test/e2e/**/*.spec.ts", "test/vrt/**/*.spec.ts"],
      playwright: false,
    },
    "apps/viewer": {},
    // The `exports` patterns in this package's package.json make every component an entry.
    // Knip therefore reports neither unused files nor unused exports for the library surface.
    "packages/shadcn": {},
    // `src/auth.ts` is a real program entry: the better-auth CLI loads it by path
    // (`generate:schema --config='./src/auth.ts'`), so knip must treat its exports as used.
    // `src/index.ts` is inferred from this package's `exports` field.
    "packages/better-auth": { entry: ["src/auth.ts"] },
    "packages/db-factory": { ignoreDependencies: ["cloudflare"] },
    "packages/db": {},
    "packages/mcp": {},
    "packages/api-query": {},
  },
} satisfies KnipConfig;
