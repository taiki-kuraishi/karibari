# フェーズ 2 /

- ゴール: Viewer の `/` で自分の `projects` の行の一覧が出て、行を押すと `/p/:projectId` へ移動する
- 前提フェーズ: なし
- 完了条件: `bun run --cwd apps/viewer test:e2e` が通り、下の E2E のケースがある。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 2 の行。component の signature は README の関数の木の【2】の行、画面の振る舞いは README の「画面」の `/` にある

## このフェーズの決まり

- 認証ゲートはフェーズ 4 で作る。このフェーズでは `/` の route を root の直下に登録する
- 行の link は素の `<a href="/p/<projects.id>">` にする。TanStack Router の link は登録済みの route しか指せず、`/p/:projectId` はフェーズ 3 で登録するため。フェーズ 3 が router の link に直す
- E2E は api（`https://api.karibari.tsar-bmb.org`）と auth（`https://auth.karibari.tsar-bmb.org`）への request を Playwright で stub し、本物の Worker には届かせない。この仕組みを `apps/viewer/test/helpers/api-stub.ts` に置き、フェーズ 3・4 の spec ファイルも使う。stub の response は README の「型と API」の形にする。api は別 origin なので、stub の response にも CORS の header（許可する origin と credentials）が要る
- E2E のケース（1 ケース = URL を変える操作 1 つ）
  - `/` で行を押す → `/p/:projectId` へ移動する（`/p/:projectId` の route はフェーズ 3 で作るので、移動先は 404 画面でよい）
- `not-found.tsx` のコメント（`/` が未登録なので router の link を使わない）は、`/` を登録すると前提が崩れるので直す
- `knip.config.ts` の `apps/viewer` の `entry` とそのコメントは、画面が api の client を import するようになるので外す
