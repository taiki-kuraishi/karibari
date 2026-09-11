# Mise tasks

Task definitions live in `.mise-tasks/` — the directory hierarchy *is* the task name
(`.mise-tasks/lint/oxlint` → `lint:oxlint`). `mise tasks ls` lists them.

Current set:

| Task | Does |
| --- | --- |
| `install` | `mise install` → `bun install --frozen-lockfile` → `lefthook install` |
| `format` | `bunx vp run oxfmt` → `bunx vp run oxlint --fix` (the rewriting side) |
| `lint` | aggregate; `depends` on every `lint:*` below |
| `lint:lockfile` | `bun install --frozen-lockfile --dry-run` |
| `lint:oxlint` | `bunx vp run oxlint --deny-warnings` |
| `lint:oxfmt` | `bunx vp run oxfmt --check` |
| `lint:type-check` | `bunx vp run -r type-check` — `-r` includes the root |
| `lint:knip` | `bun run knip` |
| `test` | `bunx vp run -r test` |

## Writing a task file

- The file needs **execute permission** (`chmod +x`).
- Start with `#!/usr/bin/env bash`, `#MISE description="..."`, then `set -euo pipefail`.
- **Aggregates go in `<dir>/_default`.** A path cannot be both a file and a directory, so
  a task that has children can only live in `_default` (`.mise-tasks/lint/_default`).
  Leaf tasks are `<dir>/<name>` or a top-level file.
- `depends` takes a JSON array: `#MISE depends=["lint:oxlint", "lint:oxfmt"]`.
- **`lint` / `test` / `format` / generator tasks need `#MISE dir="{{config_root}}"`.**
  A mise task's default cwd is wherever mise was invoked, and `bunx vp run` resolves the
  package from the cwd. `_default` files that only carry `depends` don't need it.

## The three-place sync

Every quality gate appears in three places. **Change all three together.** Adding a linter
means: a `.mise-tasks/lint/<tool>` file, a same-named `lefthook.yml` command, and a raw
command step in `.github/workflows/`.

| Place | Responsibility |
| --- | --- |
| `.mise-tasks/` | **source of truth**; what developers run |
| `lefthook.yml` | calls the mise task; command names ≡ mise task names |
| `.github/workflows/` | **raw commands**, not `mise run` |

**Why CI skips mise:** per-step timing. Collapsing everything into one `mise run lint` step
hides which command is slow. CI writes the same commands out one step at a time. (Vite+ is
the exception to "no task runner in CI", for the same reason turbo was: `-r` ordering plus
its cache can't be reproduced by hand without re-listing every workspace.)

## format rewrites, lint checks

Automatic fixes all live in `format:*`; `lint:*` is check-only both locally and in CI.
That is why **no mise task branches on the `CI` environment variable**.

lefthook and CI are deliberately asymmetric:

- **Not in lefthook:** the `--check` counterpart of anything `format` rewrites
  (`lint:oxfmt`, `lint:oxlint`). Running a `--fix` and a `--check` of the same tool under
  `parallel: true` makes the check read the file before the fix finishes and report a false
  failure. `format` catches errors by exiting non-zero; warnings are CI's `--deny-warnings`.
- **Not in lefthook:** generated-file drift detection. Locally the right move is to run the
  generator with `stage_fixed: true` and stage the output. `git diff --exit-code` is CI's job.
- **CI-only steps** (no `.mise-tasks/` counterpart, by design):
  `bun dedupe --check`, `git diff --exit-code -- mise.lock`, `wrangler types --check`, and
  `wrangler deploy --dry-run`. They exist to catch a dirty tree or an undeployable bundle on
  a runner, which is not a local concern.
- **Not in CI:** `lint:lockfile`. `setup-bun` already runs
  `bun install --frozen-lockfile`, which fails on the same drift; a second CI step would
  only repeat it.

## Vite+ specifics that bite

- **knip is never run through `vp run`.** It rewrites its own inputs while scanning, so it
  never caches; a cached knip run would be a stale read. `bun run knip` is the invocation,
  in the mise task and in CI.
- **`vp run -r <task>` includes the workspace root.** `lint:type-check` calls `-r` alone;
  a separate root-only `vp run type-check` would run the root's `tsc --noEmit` a second time.
- **`vp run -r <task>` exits 1 with `Task "<task>" not found` when no package defines it.**
  A mise task for a script no workspace implements yet cannot exist — it would fail every
  `mise run lint` and every commit. Add the task in the same change that adds the workspace
  defining the script.
- **`format` can be replayed from cache** under `cache.scripts: true` (measured
  2026-09-11: a second `mise run format` prints `oxlint --fix ◉ cache hit, replaying`).
  That is safe — vp fingerprints the input files, so a replay only happens when they are
  byte-identical, which is exactly when `format` had nothing to rewrite.

## mise.lock

`mise.lock` is generated and committed. CI runs `git diff --exit-code -- mise.lock` after
`mise install`, which only works because the file is tracked — an untracked lockfile makes
the check pass vacuously.

Regenerate it with `mise lock` (not `mise install`): `mise install` writes only the current
platform's entries, while `mise lock` writes the full cross-platform set. `mise lock` is
idempotent, and `mise install` leaves a complete lockfile untouched.

## Output policy

Silent on success, the tool's own diagnostics on failure.

- Only use a quiet flag that removes incidental success chatter. Never a flag that also
  swallows diagnostics.
- Do not wrap tool output in a capture-and-print-on-failure helper — buffering turns a
  failure's cause into an afterthought.
- No `reporters` in `vitest.config.ts`; `silent: "passed-only"` only.
- lefthook uses `output: [failure]`.
