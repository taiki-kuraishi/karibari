# フェーズ 9 GET /api/projects/:project_id/comments

- 状態: merge 済み（PR #11）
- ゴール: GET /api/projects/:project_id/comments は、`v` が無いとき `versions` の挿入した順の最後の行を使う
- 前提フェーズ: なし
- 完了条件: `bun run --cwd apps/api test` が通る。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 9 の行（`apps/api` だけ）。並びの決め方は README の「データ」の `versions` の並び、仕様は「型と API」の GET /api/projects/:project_id/comments にある
