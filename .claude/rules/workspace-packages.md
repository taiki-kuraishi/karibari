# Workspace packages and the catalog

Rules for adding, removing, or renaming a **Bun workspace package** (any `packages/*` with a
`package.json`), and for the root `package.json`'s `workspaces.catalog`.

## Layout

- `packages/*` — every workspace. `api` / `mcp` / `auth` are thin deploy units, one
  Cloudflare Worker each: wiring and routes, not reusable logic. The rest are source-only
  internal packages named `@karibari/<name>`, whose `exports` points at `./src/*.ts` — they
  are consumed as source and never bundled.
- A `packages/*` that is itself a Worker holds a `wrangler.jsonc` with `main` and has no
  `exports`; `exports` belongs to the packages consumed as source. `packages/viewer` is
  neither: a Vite build unit whose `dist/` the api Worker serves as static assets, never
  deployed on its own.

## Where a new workspace has to be registered

Adding a package is not just a directory. Follow every item that applies:

1. **`package.json` → `workspaces.packages`** if the new package does not match an existing
   glob (`apps/*`, `packages/*`).
2. **`knip.config.ts` → `workspaces`** — add an entry. Knip only special-cases the `node:`
   protocol, so a Worker importing `cloudflare:workers` reads as a dependency literally
   named `cloudflare`; those workspaces need
   `ignoreDependencies: ["cloudflare"]`.
3. **`.github/workflows/ci.yml` → the `test` job matrix** — add `{ name, path }`. The matrix
   is keyed per workspace and each job runs `bun run --cwd ${{ matrix.path }} ...`, so a
   workspace missing from the matrix has **its tests silently never run**. The matrix calls
   the workspace's `test` and `cf-typegen` scripts, and the `lint` job's
   `vp run -r type-check` calls its `type-check` script, so a workspace has to define all
   three.
4. **`.mise-tasks/`** — if the package needs a task no other workspace has (a generator, a
   special test suite), add one and sync it to lefthook and CI
   (→ `.claude/rules/mise-tasks.md`).
5. **`.claude/rules/mise-tasks.md`** — if you added a task, add it to the table there.
6. **`bun install`**, and commit `bun.lock` in the same change. There is one lockfile for
   the whole repo, so any workspace change moves it.
7. **`.gitattributes` → `linguist-generated=true`** for every generated file the workspace
   commits (`packages/*/worker-configuration.d.ts`). The registration goes in the root
   `.gitattributes` only.
8. **`AGENTS.md` → directory rules** if the new directory gets its own `AGENTS.md`.

## catalog

Shared dependency versions live in root `package.json` under `workspaces.catalog` and are
referenced as `"catalog:"`.

- **A catalog entry that nothing references fails knip** (`Unused catalog entries`). Add
  the version in the same change that adds the workspace consuming it — never ahead of it.
- **Versions that must move together still go in the catalog.** The pair
  `@cloudflare/vitest-plugin` ↔ `vitest` is cataloged as a unit, so one bump lands in one
  reviewable diff. (The two reference repos disagree: migiwa catalogs the pair, ax pins
  `@cloudflare/vitest-pool-workers` in the consuming package. karibari follows migiwa.)
- `typescript` is declared by every workspace as `"typescript": "catalog:"` in
  `peerDependencies`, and by the root in `devDependencies`.
- `bun` itself is never in the catalog: it is pinned in `packageManager` and `mise.toml`.
