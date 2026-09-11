# AGENTS.md

## Language

Code, code comments, README, commit messages, and PRs are in English.
Design specs (`docs/superpowers/specs/`) and plans (`docs/superpowers/plans/`) are in
Japanese. Both are committed — they are deliverables, not scratch notes.

## Package manager: Bun only

Always use Bun. Never npm, yarn, or pnpm. The version is pinned twice on purpose —
`packageManager` in `package.json` and `[tools] bun` in `mise.toml` — so bump both together.

`mise.toml` also pins `node`. It is not optional: the `node_modules/.bin/*` binaries are
`#!/usr/bin/env node` shims (see `.claude/rules/conventions.md`).

## Task runner: Vite+ (`vp run`)

This repo uses Vite+'s task runner instead of Turborepo. There is no `turbo.json`.

- `vp run <script>` runs a `package.json` script in the current package.
- `vp run -r <script>` runs it in every package that defines it, in dependency order taken
  from each `package.json`'s `dependencies`. **The workspace root counts as a package**,
  so `-r type-check` already includes the root's `type-check`.
- `vp run -r <script>` fails with `Task "<script>" not found` when **no** package defines
  it. Do not add a mise task for a script that no workspace implements yet.
- `vite.config.ts` sets `run.cache.scripts: true`. `package.json` scripts are *not* cached
  by default, so that single setting is what makes the task runner worth having.
- The cache lives at `node_modules/.vite/task-cache` (covered by the `node_modules/` rule
  in `.gitignore`). `vp cache clean` clears it.
- **knip never goes through `vp run`.** It rewrites its own inputs while scanning, so it
  never caches; `bun run knip` is the only correct invocation. See
  `.claude/rules/mise-tasks.md`.

## TypeScript

TypeScript 7 is a native (Go) compiler. The terminal is the source of truth for types —
editors need a TS 7 LSP or they show stale semantics. The version comes from
`workspaces.catalog`; workspaces declare `"typescript": "catalog:"` in `peerDependencies`.
Type-aware lint is `oxlint-tsgolint`, whose version tracks TypeScript's
(`7.0.2xxx` = TS 7.0.2) — bump both together.

## Formatting & linting

- Formatter: `oxfmt` (`oxfmt.config.ts`). Linter: `oxlint` (`oxlint.config.ts`).
- No Biome, Prettier, or dprint. `oxlint` runs with `typeAware` / `typeCheck` on.
- `mise run format` rewrites; `mise run lint` only checks. Never add `--fix` to a check.
- All repo-wide checks: `mise run lint` / `mise run test`.

## Workspaces

`apps/*` are thin deploy units (one Cloudflare Worker each). `packages/*` are source-only
internal packages (`@karibari/<name>`, `exports` pointing at `./src/*.ts`, consumed as source,
never bundled). Shared dependency versions live in `workspaces.catalog` and are referenced
as `"catalog:"`.

**A catalog entry that nothing references fails knip.** Add the version to `catalog` in the
same change that adds the workspace consuming it. See `.claude/rules/workspace-packages.md`.

## Worker app conventions

- `entry.ts` wires handlers to the app:

  ```ts
  export default { fetch: app.fetch } satisfies ExportedHandler<Cloudflare.Env>;
  ```
- `server.ts` starts with `export const app = new Hono<HonoEnv>()` and mounts routes and
  middleware in a **single method chain** (breaking the chain loses Hono's RPC type
  inference). `HonoEnv` is defined there; routes import it with `import type` — a value
  import creates a runtime cycle.
- Naming: routes end in `Route`, middleware in `Middleware`.

## Testing

- Workers that touch real bindings: `vitest` + `@cloudflare/vitest-plugin` (the package
  formerly named `@cloudflare/vitest-pool-workers`), configured in the app's
  `vitest.config.ts` against the **same `wrangler.jsonc` used for `wrangler deploy`** —
  there is no separate test config. Drive the Worker through
  `exports.default.fetch()` from `cloudflare:workers`.
- `vitest.config.ts` imports from plain `vitest/config`, never from `vite-plus`. Vite+ is
  only a task runner here, so an app keeps working if vp is removed.
- Set `testTimeout` explicitly when the worker has to boot: vitest's 5 s default does not
  fit workerd start-up on a 1 vCPU runner.
- Do not set `reporters`; set `silent: "passed-only"` only. Leaving reporters unset is what
  selects the MinimalReporter for agents and the github-actions reporter in CI.

## Generated code

Anything produced by a generator and committed must be registered in the root
`.gitattributes` with `linguist-generated=true` and never hand-edited. Currently none;
`apps/*/worker-configuration.d.ts` (`wrangler types`) is the first to land.

## Comments

Comments explain **why**, not **what**. Worth writing: external constraints (an RFC,
another system's quirk), rejected alternatives, and conditions that break something
elsewhere if changed. Do not hardcode values that rot (versions, file lists) — point at
the command that derives them, unless the value itself is the justification (a measured
latency), in which case keep it and date it.

## Rules to read at session start

All three repo rules are always-on (no `paths:` frontmatter), so Claude Code auto-loads
them. Other harnesses (pi, Codex, ...) must open all three by hand:

- `.claude/rules/conventions.md`
- `.claude/rules/mise-tasks.md`
- `.claude/rules/workspace-packages.md`

## Directory rules

Read a directory's `AGENTS.md` before editing anything under it. Every `AGENTS.md` has a
sibling `CLAUDE.md` containing `@AGENTS.md`, so Claude Code auto-loads it. Keep this table
1:1 with the `AGENTS.md` files that exist.

| Touching | Read first |
| --- | --- |
| `.github/**` | `.github/AGENTS.md` |

`AGENTS.md` files must not use `@import` — only `CLAUDE.md` may use `@`, because the
directive is not expanded outside Claude Code.

## After changing code

Run `mise run format`, then `mise run lint`.
