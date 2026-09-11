import { defineConfig } from "vite-plus";

// Workspace task runner config for `vp run`. Replaces Turborepo.
// `vp run -r <task>` runs a script in every workspace that defines it.
// Dependency order comes from each package.json's `dependencies`.
export default defineConfig({
  run: {
    // `package.json` scripts are NOT cached by default.
    // This switch is what makes the turbo -> vp move worth having.
    //
    // Knip is never invoked through `vp run` (use `bun run knip` instead).
    // It rewrites its own inputs while scanning, so it never caches.
    // Asking vp to cache it would be asking for a stale read.
    // See .claude/rules/mise-tasks.md.
    cache: { scripts: true },
  },
});
