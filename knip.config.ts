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
  },
} satisfies KnipConfig;
