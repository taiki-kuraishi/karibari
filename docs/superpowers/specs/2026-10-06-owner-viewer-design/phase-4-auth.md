# フェーズ 4 認証

- ゴール: 未ログインで Viewer の `/` か `/p/:projectId` を開くと、auth のサインインへ送られ、サインインの後は開いた URL へ戻る
- 前提フェーズ: 2, 3
- 完了条件: `bun run --cwd apps/api test` と `bun run --cwd apps/viewer test:e2e` が通り、下の E2E のケースがある。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 4 の行。endpoint と component の signature は README の関数の木の【4】の行と「型と API」にある

## このフェーズの決まり

- `/` と `/p/:projectId` の route は、フェーズ 2・3 が root の直下に登録している。router.tsx で認証ゲートの下に移す。画面のファイルは変えない
- E2E の stub（`apps/viewer/test/helpers/api-stub.ts`）は、既定で GET /api/session を 200 にする。フェーズ 2・3 の spec ファイルは変えずに通るようにする
- E2E のケース（1 ケース = URL を変える操作 1 つ）
  - `/` を開き、GET /api/session が 404 → README の「型と API」のサインインの URL（callbackURL は開いた URL）へ移動する
  - `/p/:projectId?v=<versions.id>` を開き、GET /api/session が 404 → サインインの URL（callbackURL は開いた URL）へ移動する
- サインインの URL への移動先（auth）も stub し、本物の auth へは届かせない
