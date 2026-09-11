# @karibari/db Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新設 source-only workspace `packages/db`（`@karibari/db`）に meta 用 D1 の schema・migration・Drizzle ランタイムを持たせる。

**Architecture:** `packages/better-auth` の骨格を写し、schema 作法だけ `ax/aeo/packages/db` 流（1 テーブル 1 ファイル）にする。migration は `drizzle-kit generate` の生成物をコミットし、CI の drift gate で退行を検出する。

**Tech Stack:** Bun、drizzle-orm 0.45.2、drizzle-kit 0.31.10（いずれも `workspaces.catalog` 済み。新規 catalog 追加なし）。

**Spec:** `docs/superpowers/specs/2026-09-11-db-package-design.md`

## Global Constraints

- Package manager は Bun のみ（npm / yarn / pnpm 禁止）。
- `packages/db` は source-only（`exports` は `./src/*.ts` を指す。bundle しない。wrangler 設定を持たない）。
- `drizzle-orm`・`drizzle-kit` は `"catalog:"` 参照。新規 catalog エントリを追加しない。
- Kysely を入れない。Turso/sqld 系の依存・ハーネスを持たない。
- 生成物（`src/migrations/**`）はコミットし、root `.gitattributes` に `linguist-generated=true` を登録する。
- 生成物パスは `oxlint.config.ts` の `ignorePatterns` に追加する。
- `knip.config.ts` に `"packages/db": {}` を追加する（空オブジェクト。`src/index.ts` は `exports` から推論されるため `entry` は要らない）。knip 登録は `src/` と同一コミット（Task 2）に入れる。
- 列キーは snake_case（SQL 列名と一致させる）。時刻は epoch 秒の素の `integer()`（`integer({ mode: "timestamp" })` 禁止）。FK は inline `.references()`（`relations()` なし）。

---

## Waves

- Wave 1: Task 1, 2, 3 ← 単独で CI が緑（`type-check`＋ drift gate）、単独でデプロイ可（ binding 配線は含まない）。1 wave = 1 PR。

---

## File Structure

- `packages/db/package.json` — workspace 定義（Task 1）。
- `packages/db/tsconfig.json` — `../../tsconfig.base.json` 継承の定型（Task 1）。
- `packages/db/drizzle.config.ts` — `dialect: sqlite`、`schema: ./src/schemas/*`、`out: ./src/migrations`、`casing: snake_case`、`migrations.prefix: timestamp`（Task 1）。
- `packages/db/src/schemas/projects.ts` ほか 3 件 — 1 テーブル 1 ファイル（Task 2）。
- `packages/db/src/schemas/index.ts` — barrel＋`schemas` オブジェクト（Task 2）。
- `packages/db/src/client.ts` — D1 向け Drizzle ファクトリ（Task 2）。
- `packages/db/src/index.ts` — `client` と `schemas` の再 export（Task 2）。
- `packages/db/src/migrations/` — 生成物（Task 3）。
- `knip.config.ts`、`.gitattributes`、`oxlint.config.ts`、`.github/workflows/ci.yml`、`bun.lock` — 登録・配線（Task 1・3）。

---

### Task 1: skeleton と登録

**Depends on:** none

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/drizzle.config.ts`
- Modify: `.gitattributes`
- Modify: `oxlint.config.ts`

**Interfaces:**
- Consumes: `packages/better-auth/` の同名ファイル（写し元）。
- Produces: `@karibari/db` workspace と `generate:migration` スクリプト（Task 2・3 が使用）。

- [ ] **Step 1: `package.json` を作る**

`packages/better-auth/package.json` を写し、better-auth 固有（`generate:schema`、`@better-auth/drizzle-adapter`、`better-auth` peer）を落とす。

```json
{
  "name": "@karibari/db",
  "private": true,
  "type": "module",
  "exports": { ".": { "default": "./src/index.ts" } },
  "scripts": {
    "type-check": "tsc --noEmit",
    "generate:migration": "drizzle-kit generate --config='./drizzle.config.ts'"
  },
  "dependencies": { "drizzle-orm": "catalog:" },
  "devDependencies": { "drizzle-kit": "catalog:" },
  "peerDependencies": { "typescript": "catalog:" }
}
```

- [ ] **Step 2: `tsconfig.json` と `drizzle.config.ts` を作る**

両方 `packages/better-auth/` の同名ファイルを写す。`tsconfig.json` は継承パスの深さが同じ（`packages/db/`）なので中身はそのまま。`drizzle.config.ts` は `schema` だけ `./src/schemas/*` に変え、残り（`dialect: sqlite`、`out: ./src/migrations`、`casing: snake_case`、`migrations: { prefix: "timestamp" }`）はそのまま。

- [ ] **Step 3: 生成物登録 2 点を足す**

`.gitattributes` に `packages/db/src/migrations/** linguist-generated=true` を足す（better-auth の migrations 行と同形）。`oxlint.config.ts` の `ignorePatterns` に `packages/db/src/migrations` を足す（同形）。手書きの `src/schemas/**` は生成物ではないので登録しない（lint 対象に残す）。knip 登録は Task 2 に回す（`src/` と同一コミットにするため）。

- [ ] **Step 4: インストールして型チェックが通ることを確認する**

Run: `bun install && bun dedupe --check && mise run format && bunx vp run -r type-check`
Expected: PASS（`bunx` 必須。`vp` は PATH に無い shim。`-r` が無いと root しか見ない）

- [ ] **Step 5: Commit**

```bash
git add packages/db/package.json packages/db/tsconfig.json packages/db/drizzle.config.ts .gitattributes oxlint.config.ts bun.lock
git commit -m "✨ db: add @karibari/db workspace skeleton"
```

---

### Task 2: schema 4 件と Drizzle クライアント

**Depends on:** Task 1

**Files:**
- Create: `packages/db/src/schemas/projects.ts`
- Create: `packages/db/src/schemas/versions.ts`
- Create: `packages/db/src/schemas/comments.ts`
- Create: `packages/db/src/schemas/shares.ts`
- Create: `packages/db/src/schemas/index.ts`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/index.ts`
- Modify: `knip.config.ts`

**Interfaces:**
- Consumes: Task 1 の workspace と `drizzle.config.ts`（`schema: ./src/schemas/*` がこの Task の出力を指す）。
- Produces: `schemas` オブジェクトと `createMetaDb`（Task 3 の `generate` が schema を読む）。

- [ ] **Step 1: `projects.ts` を書く**

```ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text().primaryKey(),
  name: text(),
  owner: text().notNull(),
  created_at: integer().notNull(),
  updated_at: integer().notNull(),
});
```

- [ ] **Step 2: `versions.ts`・`comments.ts`・`shares.ts` を書く**

```ts
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { projects } from "./projects";

export const versions = sqliteTable(
  "versions",
  {
    id: text().primaryKey(),
    project_id: text()
      .notNull()
      .references(() => projects.id),
    created_at: integer().notNull(),
  },
  (table) => [index("versions_project_idx").on(table.project_id)],
);
```

```ts
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { projects } from "./projects";
import { versions } from "./versions";

export const comments = sqliteTable(
  "comments",
  {
    id: text().primaryKey(),
    project_id: text()
      .notNull()
      .references(() => projects.id),
    version_id: text()
      .notNull()
      .references(() => versions.id),
    target: text().notNull(),
    body: text().notNull(),
    created_at: integer().notNull(),
  },
  (table) => [index("comments_project_version_idx").on(table.project_id, table.version_id)],
);
```

```ts
import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { projects } from "./projects";

export type ShareKind = "private" | "invite" | "signed";

export const shares = sqliteTable(
  "shares",
  {
    id: text().primaryKey(),
    project_id: text()
      .notNull()
      .references(() => projects.id),
    kind: text().$type<ShareKind>().notNull(),
    token: text(),
    key_id: text(),
  },
  (table) => [
    index("shares_project_idx").on(table.project_id),
    uniqueIndex("shares_token_idx").on(table.token),
  ],
);
```

- [ ] **Step 3: barrel・クライアント・entry を書く**

`src/schemas/index.ts`:

```ts
import { comments } from "./comments";
import { projects } from "./projects";
import { shares } from "./shares";
import { versions } from "./versions";

export * from "./comments";
export * from "./projects";
export * from "./shares";
export * from "./versions";

export const schemas = { projects, versions, comments, shares };
```

`src/client.ts`:

```ts
import { drizzle } from "drizzle-orm/d1";
import { schemas } from "./schemas/index";

export const createMetaDb = (binding: Parameters<typeof drizzle>[0]) =>
  drizzle(binding, { schema: schemas });

export type MetaDb = ReturnType<typeof createMetaDb>;
```

`src/index.ts`:

```ts
export * from "./client";
export * from "./schemas/index";
```

`knip.config.ts` の `workspaces` に `"packages/db": {}` を足す（`entry` 不要。`src/index.ts` は `exports` から推論される）。`src/` と同一コミットに入れること（pre-commit の `lint:knip` が未解決 entry で落ちるため）。

`Parameters<typeof drizzle>[0]` で binding 型を取るので D1 型のための新規依存は要らない。`tsc` が解決できなければその時点で repo 内の D1 型参照パターン（`worker-configuration.d.ts`）に合わせる。

- [ ] **Step 4: 全体ゲートを通す**

Run: `mise run format && mise run lint`
Expected: PASS（`lint` は oxlint・oxfmt・type-check（`-r` 全 workspace）・knip を含む）

- [ ] **Step 5: Commit**

```bash
git add packages/db/src knip.config.ts
git commit -m "✨ db: add meta tables schema and drizzle client"
```

---

### Task 3: migration 生成と drift gate

**Depends on:** Task 2

**Files:**
- Create: `packages/db/src/migrations/`（生成物。`meta/_journal.json` を含む）
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: Task 2 の `src/schemas/*`（`generate` の入力）。
- Produces: コミット済み migration 一式と CI drift gate（wave の完成条件）。

- [ ] **Step 1: migration を生成する**

Run: `bun run --cwd packages/db generate:migration`（単一 package は `--cwd`。`--filter` 禁止）
Expected: `packages/db/src/migrations/` に `<timestamp>_<name>.sql` 1 件と `meta/_journal.json` ができる。SQL が 4 テーブル分（projects / versions / comments / shares）であることを目視する。対話プロンプトが出たら既定値で進める。

- [ ] **Step 2: 生成物をコミットする**

```bash
git add packages/db/src/migrations
git commit -m "✨ db: add initial meta migration"
```

- [ ] **Step 3: CI に drift gate を足す**

`.github/workflows/ci.yml` の既存 `lint` job を開き、`bunx vp run -r type-check` ステップの直後にこの 2 step を足す（新規 job を作らない。粒度は既存に合わせる）:

```yaml
      - run: bun run --cwd packages/db generate:migration
      - run: git diff --exit-code -- packages/db/src/migrations
```

差分が出たら CI が赤になる（＝生成し忘れの検出）。`test` スクリプトを持たないので test matrix には加えない（better-auth と同じ扱い）。

- [ ] **Step 4: 全体検証してコミットする**

Run: `mise run format && mise run lint`
Expected: PASS（生成物は format/lint 対象外登録済みのはず。引っかかれば Task 1 の Step 3 の置換ミス）

```bash
git add .github/workflows/ci.yml
git commit -m "✅ db: gate migration drift in CI"
```
