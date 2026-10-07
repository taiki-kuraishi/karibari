# フェーズ 1 backend

- ゴール: api と MCP が絶対の表示 URL を返し、`versions` の行が挿入した順に並び、`versions` に行を足すと `projects.updated_at` が変わり、content の HTML のスクリプトが sandbox の中で動く
- 前提フェーズ: なし
- 完了条件: `bun run --cwd apps/api test`・`bun run --cwd packages/mcp test`・`bun run --cwd apps/remote-mcp test` が通る。`mise run cf-typegen` で作り直した `apps/remote-mcp/worker-configuration.d.ts` に `VIEWER_ORIGIN` が入っている。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 1 の行。endpoint と関数の signature は README の関数の木の【1】の行と「型と API」にある

## このフェーズの決まり

- 表示 URL の origin は、api では既存の `VIEWER_ORIGIN`（`apps/api/wrangler.jsonc` の vars）から作る。api のテストは同じ wrangler.jsonc で動くので、期待値は `https://karibari.tsar-bmb.org/p/...` になる
- `apps/remote-mcp/worker-configuration.d.ts` は生成物なので手で書かない。wrangler.jsonc を変えた後に `mise run cf-typegen` で作り直す
- MCP ツール create_project・add_version・list_comments は api の response をそのまま返すので変えない
- content の response の CSP のそばのコメント（直接開いてもスクリプトが app の origin で動かない、という前提）は、`sandbox allow-scripts` で opaque origin のまま動くことに合わせて直す
