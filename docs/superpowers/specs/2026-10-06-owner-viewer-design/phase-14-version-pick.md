# フェーズ 14 versions の行の選択

- ゴール: Viewer の `/p/:projectId` で `versions` の行を選んで切り替えられる。選んだ行は URL の `?v=` に載る
- 前提フェーズ: 4
- 完了条件: `bun run --cwd apps/viewer test:e2e` が通り、下の E2E のケースがある。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 14 の行（`apps/viewer` と、付いてくる `bun.lock`）。component・hook の signature は README の関数の木の【14】の行、画面の振る舞いは README の「画面」の `/p/:projectId`、`v` の parser は「型と API」の「データ」にある

## このフェーズの決まり

- `apps/viewer/package.json` に `nuqs`（`catalog:`）を足して `bun install` し、`bun.lock` も commit する。router.tsx の root route に nuqs の adapter（`nuqs/adapters/tanstack-router`）を足す
- フェーズ 3 の `project の表示の hook` に `選択肢`・`選ぶ` と `v` の読み書きを足し、`project の見出し` に選択欄を足す。`v` が一覧に無いときは、フェーズ 3 の 404（`notFound()`）にする
- E2E のケース（1 ケース = URL を変える操作 1 つ）
  - `/p/:projectId` で `versions` の行を選ぶ → `/p/:projectId?v=<versions.id>` へ移動する
