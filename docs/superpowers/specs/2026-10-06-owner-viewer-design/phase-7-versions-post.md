# フェーズ 7 POST /api/projects/:project_id/versions

- 状態: merge 済み（PR #9）
- ゴール: POST /api/projects/:project_id/versions が絶対の表示 URL を返し、`versions` に行を足したら `projects.updated_at` も更新する
- 前提フェーズ: なし
- 完了条件: `bun run --cwd apps/api test` が通る。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 7 の行（`apps/api` だけ）。仕様は README の「型と API」の POST /api/projects/:project_id/versions にある
