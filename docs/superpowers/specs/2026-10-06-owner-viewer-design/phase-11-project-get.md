# フェーズ 11 GET /api/projects/:project_id

- 状態: PR #14 が review 中
- ゴール: GET /api/projects/:project_id が、絶対の表示 URL を `url` で返す
- 前提フェーズ: なし
- 完了条件: `bun run --cwd apps/api test` が通る。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 11 の行（`apps/api` だけ）。仕様は README の「型と API」の GET /api/projects/:project_id にある
