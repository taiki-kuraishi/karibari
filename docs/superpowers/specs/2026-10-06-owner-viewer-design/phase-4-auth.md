# フェーズ 4 認証

- ゴール: 未ログインで Viewer の `/` か `/p/:projectId` を開くと、auth のサインインへ送られ、サインインの後は開いた URL へ戻る
- 前提フェーズ: 3, 12
- 完了条件: `bun run --cwd apps/viewer test:e2e` が通り、下の E2E のケースがある。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 4 の行（`apps/viewer` と、付いてくる `bun.lock`。auth の CORS はフェーズ 12）。component・hook の signature は README の関数の木の【4】の行と「型と API」にある

## このフェーズの決まり

- 画面のファイルは README の「viewer の画面のファイルの置き方」に従う。`routes/session-gate.tsx` の `認証ゲート` は hook の結果で `<Outlet />` かサインインへの移動を出すだけにし、`認証ゲートの hook`（`routes/session-gate/hooks/use-session-gate.ts`）が `auth の client` の `getSession` でセッションを確かめ、「サインインへ移動するか」を決める。確認を待たずに子を先に描画し、セッションが無いと確定したときだけサインインへ移動する。別の origin（auth）への移動は router の `<Navigate href>` で書ける（`useEffect` は要らない）
- `auth の client`（`apps/viewer/src/lib/auth-client.ts`）は、README の「型と API」の「データ」のとおり better-auth の client で作る。`apps/viewer/package.json` に `better-auth`（`catalog:`）を足して `bun install` し、`bun.lock` も commit する。`apps/auth/src/client/lib/auth-client.ts` の作りを参考にしてよい
- `/` と `/p/:projectId` の route は、フェーズ 2・3 が root の直下に登録している。router.tsx で認証ゲートの下に移す。画面のファイルは変えない
- E2E の stub（`apps/viewer/test/helpers/api-stub.ts`）は、既定で GET /api/auth/get-session をセッションありにする。フェーズ 2・3 の spec ファイルは変えずに通るようにする
- E2E のケース（1 ケース = URL を変える操作 1 つ）
  - `/` を開き、GET /api/auth/get-session が `null` → README の「型と API」のサインインの URL（callbackURL は開いた URL）へ移動する
  - `/p/:projectId` を開き、GET /api/auth/get-session が `null` → サインインの URL（callbackURL は開いた URL）へ移動する
- サインインの URL への移動先（auth）も stub し、本物の auth へは届かせない
