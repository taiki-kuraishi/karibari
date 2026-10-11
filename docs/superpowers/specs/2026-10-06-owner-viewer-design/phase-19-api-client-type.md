# フェーズ 19 api の client の型

- ゴール: `@karibari/api/client` が、api の client の型 `ApiClient` を export する
- 前提フェーズ: なし
- 完了条件: `bun run --cwd apps/api test` が通る。`mise run format` の後に `mise run lint`（type-check を含む）が通る。`packages/mcp` と `apps/viewer` の type-check も通る（`bunx vp run -r type-check`）
- 担当: README のファイルの表でフェーズ 19 の行（`apps/api` だけ）。型は README の「型と API」の「データ」の api の client にある

## このフェーズの決まり

- `createApiClient` の実行時の挙動は変えない。戻り値の型に `ApiClient` という名前を付けて export し、`createApiClient` の戻り値の型にする。型は値を持つ `client.ts` で名前を付け、利用側（`packages/api-query`）はその名前を import する
