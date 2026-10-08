# フェーズ 6 POST /api/projects

- 状態: merge 済み（PR #8）
- ゴール: POST /api/projects が絶対の表示 URL を返す
- 前提フェーズ: なし
- 完了条件: `bun run --cwd apps/api test` が通る。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 6 の行（`apps/api` だけ）。仕様は README の「型と API」の POST /api/projects にある
