# packages/better-auth 作成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** roppoh の `packages/better-auth` を参考に、karibari の source-only package `packages/better-auth`（better-auth 設定＋drizzle schema＋migrations）を作る。Worker への結線・招待ガード・`/verify-access` は後続 wave（本 PR では package 作成まで）。

**Architecture:** roppoh と同型（設定＋スキーマ＋migration のみ）。削るもの: `oauthProvider` / `passkey` / `admin` / `jwt` プラグイン、Discord、telemetry、org 残骸、seeder。足すもの（将来 wave）ではないが本 wave に含める spec 要件: Cookie `SameSite=Lax`、GitHub プロバイダ枠（値は worker が注入）。

**Tech Stack:** `better-auth 1.7.3`、`@better-auth/drizzle-adapter 1.7.3`、`drizzle-orm 0.45.2`、`drizzle-kit 0.31.10`（いずれも catalog 新規。user 合意により adapter は core 経路ではなく `@better-auth/drizzle-adapter` を使う）。

**Spec:** `docs/superpowers/specs/2026-09-09-tech-stack-design.md`（Auth 節: better-auth 1.7.3＋drizzle、招待制ガード — ガード自体は後続）、`docs/superpowers/specs/2026-09-09-interfaces-design.md`（Auth 節: Cookie 方針、OAuth ログイン追加）。

## Global Constraints

- Bun のみ使用。npm / yarn / pnpm 禁止。
- catalog 追加は消費 workspace と同一変更で（本 plan で全件消費する）。
- knip は `vp run` 経由禁止。`bun run knip` のみ。
- `mise run format` が書き換え側、`mise run lint` は検査のみ。
- コード・コメント・コミットメッセージは英語。spec / plan は日本語。
- `bun install` の後は必ず `bun dedupe` を走らせる。
- 生成物（`auth-schema.ts`、migrations）は commit し、手編集禁止。再生成コマンドで作り直す。
- CI・lefthook・`.mise-tasks/` の変更なし（test script を持たない package は matrix 対象外、`type-check` は `vp run -r` が自動収集）。
- 本 plan は検証まで。commit / push は user のレビュー承認があるまで行わない（PR は作らない運用）。

---

### Task 1: catalog＋package 本体＋生成物

**Files:**
- Modify: `package.json`（catalog に3件追加）
- Modify: `knip.config.ts`（`packages/better-auth` エントリ追加）
- Create: `packages/better-auth/package.json`
- Create: `packages/better-auth/tsconfig.json`
- Create: `packages/better-auth/drizzle.config.ts`
- Create: `packages/better-auth/src/auth.ts`
- Create: `packages/better-auth/src/index.ts`
- Generate: `packages/better-auth/src/auth-schema.ts`（CLI 生成、commit）
- Generate: `packages/better-auth/src/migrations/`（drizzle-kit 生成、commit）

**Interfaces:**
- Consumes: catalog（本 Task で追加）。
- Produces: 後続 wave（worker 結線）が使う `createBetterAuth`、`BetterAuth` 型、`authSchema` namespace、migrations。

- [x] **Step 1: catalog に4件追加する**

`package.json` の `workspaces.catalog` に追加する：

```jsonc
"better-auth": "1.7.3",
"@better-auth/drizzle-adapter": "1.7.3",
"drizzle-kit": "0.31.10",
"drizzle-orm": "0.45.2",
```

- [x] **Step 2: package ファイルを作る**

`packages/better-auth/package.json`：

```json
{
  "name": "@karibari/better-auth",
  "private": true,
  "type": "module",
  "exports": { ".": { "default": "./src/index.ts" } },
  "scripts": {
    "type-check": "tsc --noEmit",
    "generate:migration": "drizzle-kit generate --config='./drizzle.config.ts'",
    "generate:schema": "bun x @better-auth/cli@1.7.3 generate --config='./src/auth.ts' --output='./src/auth-schema.ts' --yes"
  },
  "dependencies": {
    "@better-auth/drizzle-adapter": "catalog:",
    "drizzle-orm": "catalog:"
  },
  "devDependencies": {
    "drizzle-kit": "catalog:"
  },
  "peerDependencies": {
    "better-auth": "catalog:",
    "typescript": "catalog:"
  }
}
```

`packages/better-auth/tsconfig.json`：

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "."
  },
  "include": ["src", "./*.ts"]
}
```

`packages/better-auth/drizzle.config.ts`：

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/auth-schema.ts",
  out: "./src/migrations",
  casing: "snake_case",
  migrations: { prefix: "timestamp" },
});
```

`packages/better-auth/src/auth.ts`：

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "./auth-schema";

const baseConfig = {
  basePath: "",
  baseURL: "",
  // Overridden by the worker with Secrets. Never commit a real value here.
  secret: "",
  // Real database is injected by the worker. CLI generate does not need a live DB.
  database: drizzleAdapter({}, { provider: "sqlite", schema }),
  socialProviders: {
    // Real credentials come from the worker env. Empty here on purpose.
    github: { clientId: "", clientSecret: "" },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: {
    // Spec: Lax. httpOnly stays on (better-auth default).
    defaultCookieAttributes: { sameSite: "lax", secure: true },
  },
};

export type AuthConfig = typeof baseConfig;
export function createBetterAuth(override: Partial<AuthConfig>) {
  return betterAuth({ ...baseConfig, ...override });
}
export type BetterAuth = ReturnType<typeof createBetterAuth>;
```

`packages/better-auth/src/index.ts`：

```ts
export { createBetterAuth } from "./auth";
export type { AuthConfig, BetterAuth } from "./auth";
export * as authSchema from "./auth-schema";
```

作った後に `bun install --no-progress --no-summary` を実行する。

- [x] **Step 3: schema を CLI 生成する**

Run: `bun run --cwd packages/better-auth generate:schema`
Expected: `packages/better-auth/src/auth-schema.ts` が生成される（user / session / account / verification の4テーブル＋relations）。

リスクと対処（gate が検出する。報告して止めず最小適応してよい）:
- `drizzleAdapter({})` が 1.7.3 で型エラーになる → worker が注入する前提を保ったまま通る最小の型付けに変える
- `sameSite: "lax"` のリテラル型不一致 → better-auth 1.7.3 の型に合わせる
- CLI が config を読めない → roppoh と同型（const config＋factory export）を保ったまま直す

- [x] **Step 4: migration を生成する**

Run: `bun run --cwd packages/better-auth generate:migration`
Expected: `packages/better-auth/src/migrations/` に SQL＋meta が生成される。

- [x] **Step 5: knip に登録し、dedupe して検査を通す**

`knip.config.ts` の `workspaces` に追加する：

```ts
"packages/better-auth": { entry: ["src/index.ts"] },
```

Run: `bun dedupe --no-progress --no-summary` then `bun run --cwd packages/better-auth type-check` then `bun run knip`
Expected: type-check exit 0、knip exit 0。knip が `drizzle.config.ts` 等に苦情を出す場合は報告して止める（安易な ignore 追加はしない）。

---

### Task 2: 全体ゲート（commit しない）

**Files:** 変更なし（検証のみ）。

- [x] **Step 1: 全体ゲートを通す**

Run: `mise run format` then `mise run lint` then `mise run test` then `bun dedupe --check` then `bunx lefthook validate`
Expected: すべて PASS。`format` の書き換えがあれば内容を確認する。`mise run test` は better-auth package に test script が無いため既存3 workspace のみ走る。

- [x] **Step 2: 変更一覧を報告する**

Run: `git status --short`
Expected: Task 1 の意図したファイルのみ。commit / push はしない。user が hunk でレビューする。
