# Tools, formatting, and linting

Tool **runtimes** are managed by mise (`mise.toml` is the single source of truth for their
versions). Language-level tools (linters, formatters, the compiler) come from Bun.

| Tool | Role |
| --- | --- |
| `bun` | JS/TS package manager and runtime |
| `node` | Required for `#!/usr/bin/env node` shims (see below) |
| `lefthook` | git hooks — `mise run install` runs `lefthook install` |
| `vp` (npm `vite-plus`) | task runner. Pinned in root `devDependencies`, run as `bunx vp` |
| `oxlint` / `oxfmt` | linter / formatter, driven through `vp run` so vp can cache them |
| `knip` | unused file / export / dependency detection — never through `vp run` |

> **`node` is not optional.** `node_modules/.bin/{vp,oxfmt,oxlint,knip,tsc}` are
> `#!/usr/bin/env node` shims, so without node every mise task dies with
> `env: node: No such file or directory` before it starts. CI gets away with
> `install_args: "bun"` only because the hosted runner already ships node.

> **`vp` is not on PATH.** It is a `node_modules/.bin` shim, not a mise tool, so mise tasks
> and hooks must spell it `bunx vp run ...`. The one exception is `lefthook`, which mise does
> manage — write `lefthook`, not `bunx lefthook`, or Bun will fetch a second copy from npm.

**Never install a language-level linter or type checker through mise.** `oxlint`, `oxfmt`,
`knip`, and `typescript` live in the root `devDependencies` and the catalog.

## Package manager: Bun only

Always use Bun. Never npm, yarn, or pnpm. mise is configured with `npm.bun = true`, so even
`npm:` backend tools install through Bun.

`bun` is pinned twice on purpose and the two must move together: `packageManager` in
`package.json`, and `[tools] bun` in `mise.toml`.

## TypeScript

TypeScript 7 is a native (Go) compiler with no `tsserver`. **The terminal is the source of
truth** — `bun run type-check` / `bunx vp run -r type-check`. Editors need a TS 7 LSP or
they report stale semantics.

The version comes from `workspaces.catalog`; every workspace declares
`"typescript": "catalog:"` in `peerDependencies`. Type-aware lint is `oxlint-tsgolint`,
whose version tracks TypeScript's (`7.0.2xxx` = TS 7.0.2) — bump both in the same change.

`tsconfig.base.json` sets `types: []` (the TS 7 default), so a package that needs globals
must list them explicitly in its own `tsconfig.json`.

## Formatting & linting

- Formatter: `oxfmt` (`oxfmt.config.ts`). Linter: `oxlint` (`oxlint.config.ts`, all five
  categories `error`, with `typeAware` and `typeCheck` on).
- No Biome, Prettier, or dprint.
- **`mise run format` rewrites; `mise run lint` only checks.** Never add `--fix` to a
  check-only path, and never branch a mise task on `CI`. Details and the lefthook/CI
  asymmetry: `.claude/rules/mise-tasks.md`.
- Don't carve a function out only to satisfy a lint rule (`max-statements`,
  `no-continue`, ...). Write the straight-line version and use a reasoned
  `// oxlint-disable-next-line <rule> -- <why>` instead.
- All repo-wide checks: `mise run lint` / `mise run test`.

### Comments start with a capital

`oxlint` runs the `style` category, which includes `capitalized-comments`, and
`mise run format` will therefore capitalise the first letter of **every** comment line.
A line that continues a sentence from the line above gets mangled (`// Order taken from`
instead of `// order taken from`), and a line that begins with a literal identifier gets
renamed (`// Package.json scripts`).

Write comments so each line already starts with a capital or a non-letter — break the line
or start it with a backticked identifier. Then `--fix` has nothing to rewrite. The rule is
worth keeping on: it costs nothing once the comment is written this way.

## .gitattributes

**One `.gitattributes`, at the repo root.** Register generated files there with paths from
the root, and never create a second one inside a subdirectory.

Line endings are left to `.editorconfig` (`end_of_line = lf`) — `.gitattributes` carries
`linguist-generated` registrations only.
