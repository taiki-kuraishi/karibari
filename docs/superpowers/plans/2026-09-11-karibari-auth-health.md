# packages/auth (/health) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1worker1push シリーズ第3弾として、`packages/auth` に `/health` のみを持つ最小 Worker 土台を追加し、CI matrix に `auth` 行を加える（mcp / api wave の踏襲）。これで spec 定義の3 Worker（api / mcp / auth）の土台が出揃う。

**Architecture:** mcp / api wave と同一形状。better-auth・D1（auth用）・`/verify-access` は対象外（後続 wave）。認証系依存（better-auth、drizzle-orm 等）は `/health` に不要なので入れない（YAGNI）。

**Tech Stack:** 変更なし（Hono 4.13.7、`@cloudflare/vitest-plugin` 1.1.2、`vitest` 4.1.11、`wrangler` 4.127.1 は catalog 済み）。

**Spec:** `docs/superpowers/specs/2026-09-09-overall-arch-design.md`（Auth Worker: better-auth＋判定集約 — 本 PR は前段の土台のみ）、`docs/superpowers/specs/2026-09-09-interfaces-design.md`（`POST /verify-access` — 本 PR の対象外、将来の配線先）、`docs/superpowers/specs/2026-09-09-tech-stack-design.md`（better-auth 1.7.3 — 本 PR では入れない）。

## Global Constraints

- Bun のみ使用。npm / yarn / pnpm 禁止。
- catalog 追加は消費 workspace と同一変更で（今回は追加なし — 必要4件は catalog 済み）。
- knip は `vp run` 経由禁止。`bun run knip` のみ。
- `mise run format` が書き換え側、`mise run lint` は検査のみ。
- コード・コメント・コミットメッセージは英語。spec / plan は日本語。
- `bun install` の後は必ず `bun dedupe` を走らせる。
- CI は mise タスクを呼ばず raw コマンド。単一 package は `bun run --cwd <path>`。
- コメント各行の先頭は大文字または非文字。
- `worker-configuration.d.ts` は生成物として commit、手編集禁止（`.gitattributes` 登録済みのため追加不要）。
- 本 plan は検証まで。commit / push は user のレビュー承認があるまで行わない（PR は作らない運用）。

---

### Task 1: packages/auth workspace 本体＋knip 登録

**Files:**
- Create: `packages/auth/package.json`
- Create: `packages/auth/tsconfig.json`
- Create: `packages/auth/wrangler.jsonc`
- Create: `packages/auth/src/entry.ts`
- Create: `packages/auth/src/server.ts`
- Create: `packages/auth/src/routes/health.ts`
- Create: `packages/auth/vitest.config.ts`
- Create: `packages/auth/test/health.spec.ts`
- Generate: `packages/auth/worker-configuration.d.ts`（commit する）
- Modify: `knip.config.ts`（`packages/auth` エントリ追加）

**Interfaces:**
- Consumes: catalog（追加なし）。
- Produces: Task 2 の CI matrix が呼ぶ `test` / `cf-typegen` / `type-check` スクリプト。

- [x] **Step 1: 失敗するテスト＋設定を作る**

`packages/auth/package.json`：

```json
{
  "name": "@karibari/auth",
  "type": "module",
  "main": "./src/entry.ts",
  "scripts": {
    "cf-typegen": "wrangler types --strict-vars=false",
    "dev": "wrangler dev",
    "test": "vitest run",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "catalog:"
  },
  "devDependencies": {
    "@cloudflare/vitest-plugin": "catalog:",
    "vitest": "catalog:",
    "wrangler": "catalog:"
  },
  "peerDependencies": {
    "typescript": "catalog:"
  }
}
```

`packages/auth/wrangler.jsonc`：

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "karibari-auth",
  "main": "./src/entry.ts",
  "compatibility_date": "2026-08-01",
  "compatibility_flags": ["nodejs_compat"],
  // Declared empty on purpose: `wrangler types` then stops inferring secrets from
  // .dev.vars, so the committed worker-configuration.d.ts stays free of machine-local values.
  "secrets": { "required": [] },
  "observability": { "enabled": true },
  "workers_dev": true,
  "preview_urls": false,
  "upload_source_maps": true
}
```

`packages/auth/tsconfig.json`：

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    // Base sets `types: []`, so list worker globals explicitly here.
    "types": ["./worker-configuration.d.ts", "@cloudflare/vitest-plugin/types"]
  },
  "include": ["src", "test", "./*.ts"]
}
```

`packages/auth/vitest.config.ts`：

```ts
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Vitest reads the same wrangler.jsonc used for deploy.
// There is no separate test config, so the test bundle matches the deploy bundle.
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
  test: { testTimeout: 30_000, silent: "passed-only" },
});
```

`packages/auth/test/health.spec.ts`：

```ts
import { exports } from "cloudflare:workers";
import { expect, test } from "vitest";

test("GET /health is 200 with a fixed liveness body", async () => {
  const response = await exports.default.fetch(new Request("http://auth/health"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ message: "ok" });
});

test("anything else is 404", async () => {
  const response = await exports.default.fetch(new Request("http://auth/"));
  expect(response.status).toBe(404);
});
```

作った後に `bun install --no-progress --no-summary` を実行する。

- [x] **Step 2: テストを実行して失敗を確認する**

Run: `bun run --cwd packages/auth test`
Expected: FAIL（`src/entry.ts` 不在）。

- [x] **Step 3: 最小実装を書く**

`packages/auth/src/server.ts`：

```ts
import { Hono } from "hono";
import { healthRoute } from "./routes/health";

export interface HonoEnv {
  Bindings: Cloudflare.Env;
}

// Single method chain: breaking it loses Hono's RPC type inference.
export const app = new Hono<HonoEnv>().route("/health", healthRoute);
```

`packages/auth/src/routes/health.ts`：

```ts
import { Hono } from "hono";
import type { HonoEnv } from "../server";

// Type-only import: a value import creates a runtime cycle.
export const healthRoute = new Hono<HonoEnv>().get("/", (c) => c.json({ message: "ok" }));
```

`packages/auth/src/entry.ts`：

```ts
import { app } from "./server";

export default { fetch: app.fetch } satisfies ExportedHandler<Cloudflare.Env>;
```

- [x] **Step 4: knip に登録し、dedupe して生成物を出す**

`knip.config.ts` の `workspaces` に追加する：

```ts
  // Knip only special-cases the `node:` protocol, so a Worker importing
  // `cloudflare:workers` reads as a dependency literally named `cloudflare`.
  "packages/auth": { ignoreDependencies: ["cloudflare"] },
```

Run: `bun dedupe --no-progress --no-summary` then `bun run --cwd packages/auth cf-typegen`
Expected: `packages/auth/worker-configuration.d.ts` が生成される。`bun dedupe --check` が通る。

- [x] **Step 5: テストと型検査が通ることを確認する**

Run: `bun run --cwd packages/auth test` then `bun run --cwd packages/auth type-check`
Expected: PASS（2本）、type-check exit 0。

---

### Task 2: CI matrix 行追加＋全体ゲート（commit しない）

**Files:**
- Modify: `.github/workflows/ci.yml`（matrix に1行追加のみ）
- Modify: `.github/AGENTS.md`（matrix 行追加に伴う記述更新が必要な場合のみ。不要なら触らない）

**Interfaces:**
- Consumes: Task 1 の workspace スクリプト。

- [x] **Step 1: matrix に auth 行を追加する**

`.github/workflows/ci.yml` の `test` job matrix に追加する：

```yaml
          - name: auth
            path: packages/auth
```

- [x] **Step 2: auth の3ステップが通ることを確認する**

Run: `bun run --cwd packages/auth cf-typegen --check` then `bun run --cwd packages/auth test` then `bun run --cwd packages/auth wrangler deploy --dry-run --outdir "$RUNNER_TEMP/auth-dist"`
Expected: すべて PASS。

- [x] **Step 3: 全体ゲートを通す**

Run: `mise run format` then `mise run lint` then `mise run test` then `bun dedupe --check` then `bunx lefthook validate`
Expected: すべて PASS。`format` の書き換えがあれば内容を確認する。

- [x] **Step 4: 変更一覧を報告する**

Run: `git status --short`
Expected: Task 1–2 の意図したファイルのみ。commit / push はしない。user が hunk でレビューする。
