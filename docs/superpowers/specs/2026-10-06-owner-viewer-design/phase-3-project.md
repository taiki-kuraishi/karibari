# フェーズ 3 /p/:projectId

- ゴール: Viewer の `/p/:projectId` で `projects` の行の HTML が出る（表示する `versions` の行は、一覧の最後の行）
- 前提フェーズ: 2, 10, 16, 17
- 完了条件: `bun run --cwd apps/viewer test:e2e` が通り、下の E2E のケースがある。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 3 の行（`apps/viewer` だけ）。component・hook の signature は README の関数の木の【3】の行、画面の振る舞いは README の「画面」の `/p/:projectId` にある。`versions` の行の選択欄と `?v=` はフェーズ 14

## このフェーズの決まり

- 画面のファイルは README の「viewer の画面のファイルの置き方」に従う。route component の `/p/:projectId の画面` は route の param を `project の表示` に渡して Suspense の境界を張るだけにし、API の呼び出しは api-query の query hook（`project の query hook`・`versions の一覧の query hook`）に任せ、表示する `versions.id` の決定と content の URL の組み立ては `project の表示の hook` に置く。`project の見出し` と `HTML の表示枠` は `project の表示` の `components/` に置き、props で受け取るだけにする
- このフェーズの `project の見出し` は、`/` への link と表示名だけを出す。`versions` の行の選択欄は出さず、表示する `versions.id` は一覧の最後の行にする（`v` は読まない）。hook の戻り値の `選択肢`・`選ぶ` はフェーズ 14 で足す
- 認証ゲートはフェーズ 4 で作る。このフェーズでは `/p/:projectId` の route を root の直下に登録する
- `projects の一覧`（`apps/viewer/src/routes/home/project-list/index.tsx`）の行の link を、フェーズ 2 の素の `<a>` から `/p/:projectId` への router の link に直す。hook は変えない。素の `<a>` にしていた理由のコメント（router の link の型は未登録の route を指せない、という内容）は、前提が崩れるので消す
- E2E の stub はフェーズ 2 の `apps/viewer/test/helpers/api-stub.ts` を使う。iframe の content の読み込みも api への request なので stub する
- E2E のケース（1 ケース = URL を変える操作 1 つ）
  - `/p/:projectId` で `/` への link を押す → `/` へ移動する
  - `/p/:projectId` で api が 404 を返し、404 画面の「ホームへ戻る」を押す → `/` へ移動する
  - どの route にも当たらない path で、404 画面の「ホームへ戻る」を押す → `/` へ移動する
- 既存の `not-found.spec.ts` は `/p/xyz` で開いていて、このフェーズの後は `/p/:projectId` の route に当たるので、どの route にも当たらない path に変える（上の最後のケース）。あわせて Arrange で `api-stub.ts` の stub を張る。「ホームへ戻る」で着く `/` が GET /api/projects を出すので、stub が無いと本物の api に届く
- 表示部品（`project の見出し`・`HTML の表示枠`）の props は受け取る側のファイルに構造で直接書き、hook の戻り値は推論に任せる。API の行の型に名前を付けない
- 404（どちらかの query hook が `null` を返す）は `project の表示の hook` が TanStack Router の `notFound()` を投げ、`/p/:projectId` の route の `notFoundComponent` に `ページが見つかりません` を置いて出す（router.tsx で設定する）。`notFound()` は query hook の結果を見てから、hook が render 中に投げる（`queryFn` の中で投げると react-query が retry する）
