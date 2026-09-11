# Design: packages/api・packages/auth の apps/ への移行

- Date: 2026-09-11
- Topic/branch: `move-api-auth-to-apps`
- Worktree: `/home/user/Documents/ghq/github.com/taiki-kuraishi/karibari.move-api-auth-to-apps`

## 目的

`packages/api` と `packages/auth` に加え `packages/mcp` を `apps/` へ移し、配置で役割を分離する。
`api` / `auth` / `mcp` は Cloudflare Worker の thin deploy unit、`packages/` の残りは source-only の内部パッケージとして扱う。

## スコープ外

`packages/viewer` は未存在のため移動対象なし。将来の配置は `apps/viewer` とする（設計節参照）。

## 要件

`api` / `auth` に加え `mcp` も `apps/` へ移す。移動に伴う設定・docs の更新（`knip.config.ts`、`ci.yml` の test matrix、`bun.lock` 再生成、`.gitattributes` の生成物 glob、`AGENTS.md` と `.claude/rules/**` の配置記述）まで含める。`mcp` は `packages/` に残さない。

## 設計

移行後の配置: `apps/api`、`apps/auth`、`apps/mcp`。`packages/` には `better-auth`、`db` が残る。将来作る `viewer` は `apps/viewer` に置き、`apps/api` からの `dist` 参照を同ツリー内に保つ。`wrangler.jsonc` の Worker 名（`karibari-api` 等）は変えない。`packages/api` → `apps/api` で深さは同一のため、`../../tsconfig.base.json` や `./src/entry.ts` 等の相対参照は維持される。

## エラー処理

参照の取りこぼしや CI 失敗が出た場合は同一 PR 内で修正し、CI 緑を merge 条件にする。

## テスト方針

各 Worker（`api` / `auth` / `mcp`）で既存の `test`・`type-check`・`cf-typegen --check` を実行し、PR の CI 緑を必須にする。
