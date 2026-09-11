# apps 移行 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `packages/api`・`packages/auth`・`packages/mcp` を `apps/` へ移動し、参照する設定と docs を更新する。

**Architecture:** 中身は変えず配置だけを移す（`git mv`）。深さが同一（`packages/X` → `apps/X`）なので相対参照は維持される。登録点（knip・CI matrix・lockfile・生成物 glob・配置 docs）を同PRで更新する。

**Tech Stack:** Bun workspaces, Vite+ task runner (`vp run`), knip, GitHub Actions, wrangler (Cloudflare Workers)。

**Spec:** `docs/superpowers/specs/2026-09-11-move-api-auth-to-apps-design.md`

## Global Constraints

- CI 緑を merge 条件にする。参照の取りこぼしや CI 失敗は同一 PR 内で修正する。
- 各 Worker（`api` / `auth` / `mcp`）で既存の `test`・`type-check`・`cf-typegen --check` を実行する。
- `docs/superpowers/specs/**` と `docs/superpowers/plans/**` は成果物として残す。過去の spec/plan（`packages/...` と書かれたものを含む）は書き換えない。
- commit は English + gitmoji（`<emoji> <scope>: <summary>`、imperative）。
- 変更後に `mise run format` を実行し、次に `mise run lint` で確認する。

## Waves

- Wave 1: Task 1, 2, 3, 4（単独で CI が緑、単独でデプロイ可。全体が1 PR）

Wave を分けない理由: 移動と設定・docs 更新は原子的に行う必要がある。ディレクトリだけ先に移すと knip・CI matrix・docs が実態と矛盾した中間状態になり、単独で CI 緑にならない。

## 明示的に触らないもの

- ルート `package.json`（`workspaces.packages` は既に `apps/*` を含む）
- 各 Worker の `package.json`（`main: ./src/entry.ts` は相対で移動安全）、`wrangler.jsonc`（Worker 名不変）、`tsconfig.json`（`../../tsconfig.base.json` は深さ同一で解決）
- `oxlint.config.ts` / `oxfmt.config.ts` / `vite.config.ts`（api/auth/mcp を名指ししていない）
- `README.md`、`docs/superpowers/**`（凍結履歴）

---

### Task 1: ディレクトリを apps/ へ移動し lockfile を再生成する

**Depends on:** none

**Files:**
- Move: `packages/api` → `apps/api`, `packages/auth` → `apps/auth`, `packages/mcp` → `apps/mcp`（`git mv`）
- Modify: `bun.lock`（`bun install` で再生成）

**Interfaces:**
- Consumes: なし
- Produces: `apps/api`、`apps/auth`、`apps/mcp` の配置（後続 task が前提にする）

Task 2 と Task 3 は `Files:` が互いに素で相互に Consume しないため並列可だが、同一 PR で差分が小さくレビュー単位を分ける利得が無いため直列で実施する。両方とも Task 1 の配置を Consume する。

- [ ] **Step 1: ディレクトリを移動する**

```bash
mkdir -p apps
git mv packages/api apps/api
git mv packages/auth apps/auth
git mv packages/mcp apps/mcp
```

Expected: `apps/api`、`apps/auth`、`apps/mcp` が存在し、`packages/` に `api`・`auth`・`mcp` が残っていないこと。

- [ ] **Step 2: lockfile と node_modules を再生成する**

```bash
bun install
bun dedupe --check
```

Expected: どちらも成功すること（`bun install` が緩いレンジを最新解決して `bun dedupe --check` が落ちた場合は `bun dedupe` を実行して再確認する）。`git status --porcelain` に `bun.lock` の変更と `packages/api → apps/api` 等の rename が出ること（`packages/*/node_modules` の stale symlink は `bun install` で解消される）。

- [ ] **Step 3: Commit**

```bash
git add bun.lock
git commit -m "📦 chore: move api, auth and mcp workspaces to apps/"
```

`git mv` の rename は stage 済みのため `bun.lock` のみ追加する（untracked の scratch 等を巻き込まない）。

---

### Task 2: パスを名指しする機能設定を更新する

**Depends on:** Task 1

**Files:**
- Modify: `knip.config.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `.gitattributes`

**Interfaces:**
- Consumes: Task 1 の `apps/api`・`apps/auth`・`apps/mcp` 配置
- Produces: 緑になる knip と CI matrix（Task 4 が検証する）

- [ ] **Step 1: `knip.config.ts` の workspace キーを書き換える**

旧（3行とも置換）:

```ts
    "packages/mcp": { ignoreDependencies: ["cloudflare"] },
    "packages/api": { ignoreDependencies: ["cloudflare"] },
    "packages/auth": { ignoreDependencies: ["cloudflare"] },
```

新:

```ts
    "apps/mcp": { ignoreDependencies: ["cloudflare"] },
    "apps/api": { ignoreDependencies: ["cloudflare"] },
    "apps/auth": { ignoreDependencies: ["cloudflare"] },
```

行順は変えない（mcp, api, auth のまま）。

- [ ] **Step 2: 動作確認（knip）**

```bash
bun run knip
```

Expected: 成功すること（knip はキャッシュしないため `bun run knip` で直接実行する）。

- [ ] **Step 3: CI test matrix の `path:` を書き換える**

旧:

```yaml
          - name: mcp
            path: packages/mcp
          - name: api
            path: packages/api
          - name: auth
            path: packages/auth
```

新（`name:` は変えない）:

```yaml
          - name: mcp
            path: apps/mcp
          - name: api
            path: apps/api
          - name: auth
            path: apps/auth
```

`matrix.path` を使う steps（`cf-typegen --check`、`test`、`wrangler deploy --dry-run`）自体は変更不要（`--cwd ${{ matrix.path }}` で追従する）。`packages/db/**` の filter と `packages/db` の cwd は対象外のため触らない。

- [ ] **Step 4: `.gitattributes` に `apps/*` の生成物 glob を追加する**

旧（置換。移動後に `packages/*/worker-configuration.d.ts` に一致するファイルは存在しなくなるため）:

```
packages/*/worker-configuration.d.ts linguist-generated=true
apps/*/worker-configuration.d.ts linguist-generated=true
```

- [ ] **Step 5: Commit**

```bash
git add knip.config.ts .github/workflows/ci.yml .gitattributes
git commit -m "🔧 chore: repoint knip, CI matrix and gitattributes to apps/"
```

---

### Task 3: 配置を説明する docs を更新する

**Depends on:** Task 1

**Files:**
- Modify: `AGENTS.md`（Workspaces 節と Generated code 節）
- Modify: `.claude/rules/workspace-packages.md`（Layout 節と item 7）
- Modify: `.claude/rules/mise-tasks.md`（`cf-typegen` の行と本文の言及）
- Modify: `.mise-tasks/cf-typegen`（`#MISE description` の1行のみ。本文の `bunx vp run -r cf-typegen` はパス非依存のため変えない）
- Modify: `.github/AGENTS.md`（`--cwd` 節のコード例）
- Modify: `.github/pull_request_template.md`（Target package の例示）

**Interfaces:**
- Consumes: Task 1 の `apps/` 配置（docs は移動後の配置を記述する）
- Produces: 配置と矛盾しない docs（Task 4 が grep で検証する）

禁止: `docs/superpowers/specs/**` と `docs/superpowers/plans/**` には触らない（凍結された成果物）。`AGENTS.md` に `@import` は書かない。`.github/**` を触る前に `.github/AGENTS.md` を読むこと（repo の Directory rules）。

- [ ] **Step 1: `AGENTS.md` の Workspaces 節と Generated code 節を書き換える**

旧:

```
`packages/*` holds every workspace. `api` / `mcp` / `auth` are thin deploy units, one
Cloudflare Worker each; the rest are source-only internal packages (`@karibari/<name>`,
`exports` pointing at `./src/*.ts`, consumed as source, never bundled). `packages/viewer` is
neither — a Vite build unit whose `dist/` the api Worker serves as static assets, never
deployed on its own. Shared dependency versions live in `workspaces.catalog` and are
referenced as `"catalog:"`.
```

新（catalog の段落は変えない）：

```
`apps/*` holds deploy units (`api` / `mcp` / `auth`, one Cloudflare Worker each).
`packages/*` holds source-only internal packages (`@karibari/<name>`,
`exports` pointing at `./src/*.ts`, consumed as source, never bundled). `apps/viewer` is
neither — a Vite build unit whose `dist/` the api Worker serves as static assets, never
deployed on its own. Shared dependency versions live in `workspaces.catalog` and are
referenced as `"catalog:"`.
```

Generated code 節の1行も置換する。旧: `` `packages/*/worker-configuration.d.ts` is the first to land `` → 新: `` `apps/*/worker-configuration.d.ts` is the first to land ``。

- [ ] **Step 2: `.claude/rules/workspace-packages.md` を書き換える**

(2a) タイトル直下の1行。旧:

```
Rules for adding, removing, or renaming a **Bun workspace package** (any `packages/*` with a
`package.json`), and for the root `package.json`'s `workspaces.catalog`.
```

新:

```
Rules for adding, removing, or renaming a **Bun workspace package** (any `apps/*` or
`packages/*` with a `package.json`), and for the root `package.json`'s `workspaces.catalog`.
```

(2b) Layout の1つ目の箇条書き。旧:

```
- `packages/*` — every workspace. `api` / `mcp` / `auth` are thin deploy units, one
  Cloudflare Worker each: wiring and routes, not reusable logic. The rest are source-only
  internal packages named `@karibari/<name>`, whose `exports` points at `./src/*.ts` — they
  are consumed as source and never bundled.
```

新:

```
- `apps/*` — thin deploy units: `api` / `mcp` / `auth`, one
  Cloudflare Worker each: wiring and routes, not reusable logic.
- `packages/*` — source-only internal packages named `@karibari/<name>`, whose `exports`
  points at `./src/*.ts` — they are consumed as source and never bundled.
```

(2c) Layout の2つ目の箇条書き。旧:

```
- A `packages/*` that is itself a Worker holds a `wrangler.jsonc` with `main` and has no
  `exports`; `exports` belongs to the packages consumed as source. `packages/viewer` is
  neither: a Vite build unit whose `dist/` the api Worker serves as static assets, never
  deployed on its own.
```

新:

```
- An `apps/*` that is itself a Worker holds a `wrangler.jsonc` with `main` and has no
  `exports`; `exports` belongs to the packages consumed as source. `apps/viewer` is
  neither: a Vite build unit whose `dist/` the api Worker serves as static assets, never
  deployed on its own.
```

(2d) item 7 の括弧内。旧 `(`packages/*/worker-configuration.d.ts`)` → 新 `(`apps/*/worker-configuration.d.ts`)`。item 1・3・6 の本文は両 glob・`packages/better-auth` とも現状どおり正しいため変えない。

- [ ] **Step 3: `.claude/rules/mise-tasks.md` の2箇所を書き換える**

表の行。旧:

```
| `cf-typegen` | `bunx vp run -r cf-typegen` — rewrites `packages/*/worker-configuration.d.ts` |
```

新:

```
| `cf-typegen` | `bunx vp run -r cf-typegen` — rewrites `apps/*/worker-configuration.d.ts` |
```

本文の `the committed `packages/*/worker-configuration.d.ts`` → `the committed `apps/*/worker-configuration.d.ts``。

- [ ] **Step 4: `.mise-tasks/cf-typegen` の description を書き換える**

旧:

```bash
#MISE description="Regenerate packages/*/worker-configuration.d.ts from wrangler.jsonc"
```

新:

```bash
#MISE description="Regenerate apps/*/worker-configuration.d.ts from wrangler.jsonc"
```

- [ ] **Step 5: `.github/` の例示を書き換える**

- `.github/AGENTS.md` の `bun run --cwd packages/mcp test` → `bun run --cwd apps/mcp test`（コード例の1行内の置換）
- `.github/pull_request_template.md` の `e.g. packages/mcp` → `e.g. apps/mcp`（Target package 例示の置換）

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md .claude/rules/workspace-packages.md .claude/rules/mise-tasks.md .mise-tasks/cf-typegen .github/AGENTS.md .github/pull_request_template.md
git commit -m "📝 docs: describe apps/ deploy units layout"
```

---

### Task 4: 全 Worker の検証と repo 全体チェックを通す

**Depends on:** Task 1, Task 2, Task 3

**Files:** 変更なし（検証のみ。修正が発生した場合のみそのファイル）

**Interfaces:**
- Consumes: Task 1〜3 のすべて
- Produces: CI 緑の見込み（DONE 報告用の実行結果）

- [ ] **Step 1: 各 Worker で CI と同じ検証を実行する**

```bash
bun run --cwd apps/mcp cf-typegen --check
bun run --cwd apps/mcp test
bun run --cwd apps/api cf-typegen --check
bun run --cwd apps/api test
bun run --cwd apps/auth cf-typegen --check
bun run --cwd apps/auth test
```

Expected: すべて成功すること（CI の test job が実行する `cf-typegen --check`・`test` と同一。`wrangler deploy --dry-run` は CI-only のためローカルでは実行しない）。

```bash
bunx vp run -r type-check
```

Expected: 成功すること（CI の lint job 内の `vp run -r type-check` と同一ステップ。lint 全体ではない）。

- [ ] **Step 2: 残存参照がないか確認する**

```bash
rg -n "packages/(api|auth|mcp)\b" --glob '!docs/superpowers/**' --glob '!bun.lock' .
```

Expected: ヒットなし（`docs/superpowers/**` の凍結履歴と `bun.lock` は除外。`rg` が無い環境では `grep -rnE "packages/(api|auth|mcp)\b" --exclude=bun.lock --exclude-dir=node_modules --exclude-dir=.git .` を使い、`docs/superpowers/**` のヒットを無視する）。

```bash
rg -n 'worker-configuration' --glob '!docs/**' .
```

Expected: `packages/*/worker-configuration.d.ts` を含むヒットがゼロで、残りはすべて `apps/*` であること。

- [ ] **Step 3: repo 全体のチェックを実行する**

```bash
mise run format
mise run lint
```

Expected: `mise run lint` が成功すること。`format` による差分が出たら内容を確認して別途 commit する。

- [ ] **Step 4: 終了確認（commit なし）**

```bash
git status --porcelain
```

Expected: 空であること（Step 3 で差分が出た場合のみ、その修正を commit してから空であること）。検証のみの task のため、差分がなければ commit しない。

---
