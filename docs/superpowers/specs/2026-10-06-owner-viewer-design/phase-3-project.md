# フェーズ 3 /p/:projectId

- ゴール: Viewer の `/p/:projectId` で `projects` の行の HTML が出て、`versions` の行を選んで切り替えられる
- 前提フェーズ: 1, 2
- 完了条件: `bun run --cwd apps/viewer test:e2e` が通り、下の E2E のケースがある。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 3 の行。component の signature は README の関数の木の【3】の行、画面の振る舞いは README の「画面」の `/p/:projectId` にある

## このフェーズの決まり

- 認証ゲートはフェーズ 4 で作る。このフェーズでは `/p/:projectId` の route を root の直下に登録する
- `projects の一覧`（`apps/viewer/src/components/project-list.tsx`）の行の link を、フェーズ 2 の素の `<a>` から `/p/:projectId` への router の link に直す。受け取るものは変えない
- E2E の stub はフェーズ 2 の `apps/viewer/test/helpers/api-stub.ts` を使う。iframe の content の読み込みも api への request なので stub する
- E2E のケース（1 ケース = URL を変える操作 1 つ）
  - `/p/:projectId` で `versions` の行を選ぶ → `/p/:projectId?v=<versions.id>` へ移動する
  - `/p/:projectId` で `/` への link を押す → `/` へ移動する
  - `/p/:projectId` で api が 404 を返し、404 画面の「ホームへ戻る」を押す → `/` へ移動する
  - どの route にも当たらない path で、404 画面の「ホームへ戻る」を押す → `/` へ移動する
- 既存の `not-found.spec.ts` は `/p/xyz` で開いていて、このフェーズの後は `/p/:projectId` の route に当たるので、どの route にも当たらない path に変える（上の最後のケース）
