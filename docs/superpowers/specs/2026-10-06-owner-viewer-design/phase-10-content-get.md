# フェーズ 10 GET /api/projects/:project_id/versions/:version_id/content

- 状態: merge 済み（PR #12）
- ゴール: content の response の HTML のスクリプトが、sandbox の中で動く
- 前提フェーズ: なし
- 完了条件: `bun run --cwd apps/api test` が通る。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 10 の行（`apps/api` だけ）。仕様は README の「型と API」の GET /api/projects/:project_id/versions/:version_id/content にある
