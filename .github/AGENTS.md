# GitHub Actions rules

Conventions for `.github/workflows/` and `.github/actions/`.

## Layout

- `ci.yml` — the JS/TS quality gate: `changes`, `lint`, `db-drift` (path-gated),
  `knip`, and the `test` matrix with its `test-ok` aggregate. Add a matrix entry
  per workspace; see `.claude/rules/workspace-packages.md`.

**Split a workflow by runtime or domain, and don't invent a new granularity on your own —
ask.** Composite actions go in `.github/actions/<name>` and are called with
`uses: ./.github/actions/<name>`.

## CI runs raw commands, not mise tasks

**CI never calls `mise run <task>`.** Per-step timing is the reason: collapsing the gate
into one aggregate step hides which command is slow. Write the same commands as one step
each. Vite+ is the exception, for the same reason turbo was — `-r` ordering plus its cache
cannot be reproduced as per-workspace steps without a list that rots.

`jdx/mise-action` is still used, but **only to install tools**.

## Every workflow

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.run_id }}
  cancel-in-progress: true
```

- `github.workflow` must lead the group: concurrency groups share one repo-wide namespace,
  so without it a run can cancel a different workflow's run.
- `github.head_ref` is only populated for `pull_request`. On `push` / `workflow_dispatch`
  the `run_id` fallback makes every run unique, so main runs are neither cancelled nor
  serialised.
- Every job needs `timeout-minutes`. `permissions: { contents: read }` is set once at the
  workflow level.
- Pin third-party actions to a major tag (`actions/checkout@v7`).

## Path gating (when you add it)

CI runs every job on every PR today. If you gate jobs by path, use a leading `changes` job
(`dorny/paths-filter`) — **never `on.pull_request.paths:` / `on.push.paths:`**, because a
path that doesn't match means no Check Run is created at all and the job can't be a
required status check.

Two traps to carry forward:

- A `changes` job needs `permissions: pull-requests: read`. `contents: read` alone fails
  with `Resource not accessible by integration`, because paths-filter reads the changed
  file list through the API.
- `dorny/paths-filter` negation is not exclusion. Under the default
  `predicate-quantifier: some` each pattern is OR-ed, so `!apps/foo/**` matches every file
  *outside* `apps/foo` — a docs-only PR turns the gate on.

Generator drift checks that only need to run when their package changes go in a dedicated
job gated by the `changes` job (precedent: `db-drift` for `packages/db/**`), not in `lint`.

## Matrix jobs need an aggregate job

A matrix job's expanded check names make a bad required status check: when the matrix is
empty the job never reports, and the PR is blocked forever. Give every matrix family a
sibling aggregate:

```yaml
test-ok:
  needs: [test]
  if: always()
  runs-on: ubuntu-latest
  timeout-minutes: 5
  steps:
    - if: contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled')
      run: exit 1
```

Register **only the aggregate name** as a required status check.

Matrix entries are per workspace, and each job runs
`bun run --cwd ${{ matrix.path }} ...`. Set `worker: true` for deploy units and
`worker: false` for tested source packages; only Worker entries run type generation and
Wrangler dry-run. See `.claude/rules/workspace-packages.md` for the full follow-up list.

## Runner size and the vp task cache

- **`knip` runs on `ubuntu-latest`, not `ubuntu-slim`.** knip parses with `oxc-parser`,
  which pre-allocates a multi-GB `ArrayBuffer` that fails on `ubuntu-slim`'s ~4.9 GB with
  `RangeError: Array buffer allocation failed`. `oxlint` and `oxfmt` are native binaries and
  do not hit this, so only knip needs the larger runner.
- **`cache-vp-tasks` goes only on jobs that call `vp run`** — today only `lint`. Not on
  `knip`, which doesn't run through vp at all, and not on `test`, whose every step is a
  `bun run --cwd <path> <script>` call.
- The cache action's key must **not** include source or lockfile hashes:

  ```yaml
  path: node_modules/.vite/task-cache
  key: vite-task-${{ runner.os }}-${{ runner.arch }}-${{ github.run_id }}-${{ github.run_attempt }}
  restore-keys: vite-task-${{ runner.os }}-${{ runner.arch }}-
  ```

  vp fingerprints task inputs itself. Hashing sources into the Actions key makes GitHub
  skip restores that would have hit. A per-run primary key means `actions/cache` always
  saves in its post step and `restore-keys` picks the newest compatible entry.
  Restore the cache **after** installing dependencies, before the first `vp run`.

## mise

`jdx/mise-action` must always be given `install_args:`. Without it, every tool in
`mise.toml` gets installed, and a job that only needs a linter pays for the rest.

| Caller | `install_args` | Why |
| --- | --- | --- |
| `ci.yml` (`lint`, `knip`, `test`) | `bun` | vp, oxlint, oxfmt, tsc, knip, and wrangler all come from node_modules; the hosted runner already ships node |

`install_args` is part of the mise cache key, so jobs with different tool sets never clobber
each other's cache.

## Don't weaken the gate

- **Never `--fix` in CI.** `--deny-warnings` is the CI spelling; `--fix` would let a
  violation be rewritten into a green run.
- **Don't loop CI through the task runner to "keep it in sync".** The three-place sync rule
  (`.claude/rules/mise-tasks.md`) is what keeps them aligned, not indirection.
- Generated-file drift is checked with the generator's own `--check` where it has one
  (`cf-typegen --check`). `mise.lock` and the committed drizzle migrations have no such
  flag, so both are caught by regenerating and running `git diff --exit-code` — the two
  places the gate writes to the tree. The `test` job
  runs the `cf-typegen --check` step **before** the tests, so a stale committed
  `worker-configuration.d.ts` fails the job instead of silently type-checking against it.

## Single-package steps use `--cwd`

```yaml
# ❌ --filter is for running several packages in parallel; on one package it only adds
#    output prefixes and elided lines
- run: bun run --filter @karibari/mcp test

# ✅
- run: bun run --cwd apps/mcp test
```

This includes every matrix job. `bun install --filter` is a different flag and unaffected.

## `${{ }}` never contains shell quoting

GitHub Actions evaluates `${{ }}` before the shell sees it. Bash escaping inside the
expression reaches the expression parser and **the whole workflow fails to compile — zero
jobs are created** (a 0-second failure with no job list). Pass values through `env:`
instead. `yaml.safe_load` does not evaluate `${{ }}`, so a local YAML parse check will not
catch this.
