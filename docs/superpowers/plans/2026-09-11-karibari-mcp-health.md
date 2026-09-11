# packages/mcp (/health) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** karibari spec定義の3 Workerのうち最初の一つとして、`packages/mcp` に `/health` のみを持つ最小 Worker 土台と CI の `test` job を追加する（octo PR #2 の移植）。

**Architecture:** octo PR #2（`ab16fc6`）の直移植。配置だけ `apps/mcp` → `packages/mcp` に読み替える（karibari spec が Worker を `packages/*` に置くため）。Hono 単一チェー配線＋`wrangler.jsonc`＋`@cloudflare/vitest-plugin` の構成は変えない。

**Tech Stack:** Hono（catalog、バージョンは Task 1 の決定に従う）、`@cloudflare/vitest-plugin 1.1.2`、`vitest 4.1.11`、`wrangler 4.127.1`、TypeScript 7.0.2（変更なし）。

**Spec:** `docs/superpowers/specs/2026-09-09-tech-stack-design.md`（MCP 基盤: `@modelcontextprotocol/server` v2系を Hono に載せる — 本 PR はその前段の `/health` 土台のみ）、`docs/superpowers/specs/2026-09-09-overall-arch-design.md`（Worker 分割方針）、`docs/superpowers/specs/2026-09-09-interfaces-design.md`（MCP ツール一覧 — 本 PR の対象外、将来の配線先として参照のみ）。

## Global Constraints

- Bun のみ使用。npm / yarn / pnpm 禁止。
- `workspaces.catalog` に追加するバージョンは、それを消費する workspace の追加と同一変更で行う（未参照 catalog entry は knip で落ちる）。
- knip は `vp run` 経由禁止。`bun run knip` のみ。
- `mise run format` が書き換え側、`mise run lint` は検査のみ。check に `--fix` を付けない。
- コード・コメント・コミットメッセージは英語。spec / plan は日本語。
- `vp run -r <task>` はそれを定義する workspace が1つも無いと exit 1。`.mise-tasks/cf-typegen` は本 PR で workspace と同時追加する。
- CI は mise タスクを呼ばず raw コマンドを1ステップずつ書く。単一 package の実行は `bun run --cwd <path>`。
- コメントは各行の先頭を大文字または非文字で書く（oxlint `capitalized-comments` 対策）。
- `worker-configuration.d.ts` は生成物として commit し、root `.gitattributes` に `linguist-generated=true` 登録。手編集禁止。
- 本 plan は検証まで。commit / push は user の指示があるまで行わない。

---

### Task 1: catalog 追加と knip 登録

**Files:**
- Modify: `package.json`（catalog に4件追加）
- Modify: `knip.config.ts`（`packages/mcp` エントリ追加）
- Test: `bun install --frozen-lockfile --dry-run`、`bun run knip`

**Interfaces:**
- Consumes: なし（最初のタスク）。
- Produces: Task 2 が使う catalog バージョン（`hono` / `@cloudflare/vitest-plugin` / `vitest` / `wrangler`）。workspace 側はすべて `"catalog:"` で参照する。

- [x] **Step 1: catalog に4件追加する**

`package.json` の `workspaces.catalog` をこうする（hono のバージョンは plan 承認時の決定に従う。デフォルトは spec の `4.13.7`）：

```jsonc
"catalog": {
  "oxfmt": "0.64.0",
  "oxlint": "1.79.0",
  "typescript": "7.0.2",
  "@cloudflare/vitest-plugin": "1.1.2",
  "hono": "4.13.7",
  "vitest": "4.1.11",
  "wrangler": "4.127.1"
}
```

- [x] **Step 2: knip に workspace を登録する**

`knip.config.ts` の `workspaces` をこうする：

```ts
workspaces: {
  ".": {},
  // Knip only special-cases the `node:` protocol, so a Worker importing
  // `cloudflare:workers` reads as a dependency literally named `cloudflare`.
  "packages/mcp": { ignoreDependencies: ["cloudflare"] },
},
```

- [x] **Step 3: lockfile を更新し、dedupe が通ることを確認する**

Run: `bun install --no-progress --no-summary` then `bun dedupe --check`
Expected: `bun.lock` が更新され、`No duplicates` と出る。

Note: この時点では `bun run knip` は exit 1（`Unused catalog entries (4)`＋`Remove from workspaces: packages/mcp`）。Task 2 で緑になる。Task 1–2 は同一コミット単位とし、Task 1 単独ではコミットしない。

---

### Task 2: packages/mcp workspace 本体

**Files:**
- Create: `packages/mcp/package.json`
- Create: `packages/mcp/tsconfig.json`
- Create: `packages/mcp/wrangler.jsonc`
- Create: `packages/mcp/src/entry.ts`
- Create: `packages/mcp/src/server.ts`
- Create: `packages/mcp/src/routes/health.ts`
- Create: `packages/mcp/vitest.config.ts`
- Create: `packages/mcp/test/health.spec.ts`
- Generate: `packages/mcp/worker-configuration.d.ts`（`wrangler types` の生成物、commit する）
- Modify: `.gitattributes`（1行追加）

**Interfaces:**
- Consumes: Task 1 の catalog（`hono` 等は `"catalog:"` 参照）。
- Produces: Task 3 が使う `cf-typegen` スクリプト（`packages/mcp/package.json` 内）、Task 4 の CI matrix が呼ぶ `test` / `cf-typegen` / `type-check` スクリプト。

- [x] **Step 1: 失敗するテストを書く**

`packages/mcp/test/health.spec.ts` を作る（`src` はまだ作らない）：

```ts
import { exports } from "cloudflare:workers";
import { expect, test } from "vitest";

test("GET /health is 200 with a fixed liveness body", async () => {
  const response = await exports.default.fetch(new Request("http://mcp/health"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ message: "ok" });
});

test("anything else is 404", async () => {
  const response = await exports.default.fetch(new Request("http://mcp/"));
  expect(response.status).toBe(404);
});
```

同時に `packages/mcp/package.json` を作る（テスト実行に必要）：

```json
{
  "name": "@karibari/mcp",
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

`packages/mcp/vitest.config.ts` を作る：

```ts
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Vitest reads the same wrangler.jsonc used for deploy. There is no
// separate test config, so the test bundle matches the deploy bundle.
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
  test: { testTimeout: 30_000, silent: "passed-only" },
});
```

`packages/mcp/wrangler.jsonc` を作る：

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "karibari-mcp",
  "main": "./src/entry.ts",
  "compatibility_date": "2026-08-01",
  "compatibility_flags": ["nodejs_compat"],
  "secrets": { "required": [] },
  "observability": { "enabled": true },
  "workers_dev": true,
  "preview_urls": false,
  "upload_source_maps": true
}
```

`packages/mcp/tsconfig.json` を作る：

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

- [x] **Step 2: テストを実行して失敗を確認する**

Run: `bun run --cwd packages/mcp test`
Expected: FAIL（`src/entry.ts` が存在しない）。

- [x] **Step 3: 最小実装を書く**

`packages/mcp/src/server.ts` を作る：

```ts
import { Hono } from "hono";
import { healthRoute } from "./routes/health";

export interface HonoEnv {
  Bindings: Cloudflare.Env;
}

// Single method chain: breaking it loses Hono's RPC type inference.
export const app = new Hono<HonoEnv>().route("/health", healthRoute);
```

`packages/mcp/src/routes/health.ts` を作る：

```ts
import { Hono } from "hono";
import type { HonoEnv } from "../server";

// Type-only import: a value import creates a runtime cycle.
export const healthRoute = new Hono<HonoEnv>().get("/", (c) => c.json({ message: "ok" }));
```

`packages/mcp/src/entry.ts` を作る：

```ts
import { app } from "./server";

export default { fetch: app.fetch } satisfies ExportedHandler<Cloudflare.Env>;
```

- [x] **Step 4: 生成物を出す**

Run: `bun run --cwd packages/mcp cf-typegen`
Expected: `packages/mcp/worker-configuration.d.ts` が生成される（約15k行、commit する）。

- [x] **Step 5: テストが通ることを確認する**

Run: `bun run --cwd packages/mcp test`
Expected: PASS（2本）。

- [x] **Step 6: `.gitattributes` に登録する**

Root `.gitattributes` に1行追加する：

```
packages/*/worker-configuration.d.ts linguist-generated=true
```

---

### Task 3: cf-typegen タスクと規約 docs の同期

**Files:**
- Create: `.mise-tasks/cf-typegen`（要 `chmod +x`）
- Modify: `.claude/rules/mise-tasks.md`（タスク表に1行追加＋生成物 drift の記述更新）
- Modify: `.claude/rules/workspace-packages.md`（`.gitattributes` 登録項目の追加＋matrix が呼ぶスクリプト要件の追記）
- Modify: `lefthook.yml`（`cf-typegen` を入れない理由のコメントのみ。コマンド追加なし）

**Interfaces:**
- Consumes: Task 2 の `cf-typegen` スクリプト。
- Produces: Task 4 の CI が前提にする運用規約（3箇所同期: `.mise-tasks/`・lefthook・CI）。

- [x] **Step 1: mise タスクを作る**

`.mise-tasks/cf-typegen` を作る：

```bash
#!/usr/bin/env bash
#MISE description="Regenerate packages/*/worker-configuration.d.ts from wrangler.jsonc"
#MISE dir="{{config_root}}"

set -euo pipefail

# Always rewrites, so vp never caches it. Kept out of lefthook: wrangler
# truncates the file before writing, which races parallel readers.
bunx vp run -r cf-typegen
```

Run: `chmod +x .mise-tasks/cf-typegen`

- [x] **Step 2: 再生成が冪等なことを確認する**

Run: `mise run cf-typegen && git status --short -- packages/mcp/worker-configuration.d.ts`
Expected: 差分なし（Task 2 の生成物と同一）。

- [x] **Step 3: 規約 docs を同期する**

`.claude/rules/mise-tasks.md` のタスク表に `cf-typegen` の行を追加し、生成物 drift 検出が CI の `cf-typegen --check` 担当である旨を書く。`.claude/rules/workspace-packages.md` に `.gitattributes` 登録項目を追加し、matrix が呼ぶ `test` / `cf-typegen` / `type-check` スクリプトが workspace に必須である旨を追記する。`lefthook.yml` には `cf-typegen` を入れない理由のコメントだけ残す（truncated-read race のため）。

---

### Task 4: CI の test job と AGENTS 同期

**Files:**
- Modify: `.github/workflows/ci.yml`（`test` matrix job＋集約 `test-ok` job 追加）
- Modify: `.github/AGENTS.md`（`test` / `test-ok` 反映、`cache-vp-tasks` は `vp run` を呼ぶ job のみ）
- Modify: `AGENTS.md`（Generated code 節を `packages/*/worker-configuration.d.ts` 実在に更新）

**Interfaces:**
- Consumes: Task 2 の workspace スクリプト（`test` / `cf-typegen` / `type-check`）。
- Produces: CI ゲート。Task 5 がローカルで検証する。

- [x] **Step 1: `test` / `test-ok` job を追加する**

`.github/workflows/ci.yml` に追加する（`path` は `packages/mcp`。`cache-vp-tasks` は付けない。全ステップが `bun run --cwd` で `vp run` を通らないため）：

```yaml
  test:
    runs-on: ubuntu-slim
    timeout-minutes: 15
    strategy:
      matrix:
        include:
          - name: mcp
            path: packages/mcp
    name: test (${{ matrix.name }})
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup-mise
        with: { install_args: "bun" }
      - uses: ./.github/actions/setup-bun
      - run: bun run --cwd ${{ matrix.path }} cf-typegen --check
      - run: bun run --cwd ${{ matrix.path }} test
      - run: bun run --cwd ${{ matrix.path }} wrangler deploy --dry-run --outdir "$RUNNER_TEMP/${{ matrix.name }}-dist"

  test-ok:
    needs: [test]
    if: always()
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - if: contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled')
        run: exit 1
```

`test-ok` のみを required status check にする（matrix 空で PR が永久ブロックされるのを防ぐ）。

- [x] **Step 2: `cf-typegen --check` がローカルで動くことを確認する**

Run: `bun run --cwd packages/mcp cf-typegen --check`
Expected: PASS（生成物が fresh）。もし wrangler が `--check` を解さない場合は plan から逸脱するので報告して止める（代替案: 再生成＋`git diff --exit-code`）。

- [x] **Step 3: AGENTS docs を同期する**

`.github/AGENTS.md` の Layout 節（`test` job 参加済みに更新）、`cache-vp-tasks` の適用条件を「`vp run` を呼ぶ job のみ」に修正。`AGENTS.md` の Generated code 節を `packages/*/worker-configuration.d.ts` 実在に更新する。

---

### Task 5: 全体ゲートと引き継ぎ（commit しない）

**Files:** 変更なし（検証のみ）。

- [x] **Step 1: format してから lint を通す**

Run: `mise run format` then `mise run lint`
Expected: 両方 PASS。`format` による書き換えがあれば内容を確認する。

- [x] **Step 2: 全テストを通す**

Run: `mise run test` then `bun dedupe --check` then `bunx lefthook validate`
Expected: すべて PASS。

- [x] **Step 3: 変更一覧を報告する**

Run: `git status --short` and `git diff --stat`
Expected: 意図したファイルのみ。`worker-configuration.d.ts`（約15k行）が含まれることを確認する。commit / push はしない。user が hunk でレビューする。
