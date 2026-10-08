# フェーズ 13 MCP ツール get_project_url

- ゴール: MCP ツール get_project_url が絶対の表示 URL を返す
- 前提フェーズ: 11
- 完了条件: `bun run --cwd packages/mcp test` が通る。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 13 の行（`packages/mcp` と、付いてくる spec の 1 行）。仕様は README の「型と API」の MCP ツール get_project_url にある

## このフェーズの決まり

- MCP の文脈（`McpContext`）・`toMcpContext`・`apps/remote-mcp` は変えない。create_project・add_version・list_comments は api の response を中継するだけなので変えない
- `docs/superpowers/specs/2026-09-09-interfaces-design.md` の MCP の公開 URL 取得の記述（shares の状態から表示用 URL を組み立てる、という内容）を、api の `url` を使う形に直す。招待・署名付きの URL の組み立ては、今は未実装と併記する
