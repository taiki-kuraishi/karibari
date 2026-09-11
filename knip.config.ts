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
    "packages/mcp": { ignoreDependencies: ["cloudflare"] },
    "packages/api": { ignoreDependencies: ["cloudflare"] },
    "packages/auth": { ignoreDependencies: ["cloudflare"] },
    // `src/auth.ts` is a real program entry: the better-auth CLI loads it by path
    // (`generate:schema --config='./src/auth.ts'`), so knip must treat its exports as used.
    // `src/index.ts` is inferred from this package's `exports` field.
    "packages/better-auth": { entry: ["src/auth.ts"] },
  },
} satisfies KnipConfig;
