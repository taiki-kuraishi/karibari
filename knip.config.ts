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
  },
} satisfies KnipConfig;
