# フェーズ 12 auth の CORS

- ゴール: viewer の origin から、cookie 付きで auth の `GET /api/auth/get-session` を呼べる
- 前提フェーズ: なし
- 完了条件: `bun run --cwd apps/auth test` が通る。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 12 の行（`apps/auth` と、付いてくる spec の記述）。仕様は README の「型と API」の GET /api/auth/get-session にある

## このフェーズの決まり

- 許可する origin は viewer の origin だけにする。値は auth が既に持っている信頼する origin（`packages/better-auth` の `trustedOrigins`）から取り、viewer の origin を別の場所に重ねて書かない。cookie を送る request なので credentials を許可する
- middleware は `/api/auth/*` の better-auth の handler より前に置く。preflight（OPTIONS）に答え、better-auth 自身の origin の検査と、auth の画面（同じ origin）・MCP の client（browser でない）の既存の動きを変えない
- `apps/auth/src/server.ts` の Hono の chain を途中で切らない
- `docs/superpowers/specs/2026-09-09-interfaces-design.md` には、フェーズ 5 が `GET /api/session` を書いた箇所がある（Viewer の画面の節の未ログインの例外と、Api の節の `GET /api/session` の項目）。viewer は auth の `get-session` を better-auth の client で直接呼ぶ形に変わったので、Api の節の項目は消し、未ログインの確認は auth の `get-session` で行う、auth に viewer の origin の CORS を足す、と書き直す
- `docs/superpowers/specs/2026-09-09-overall-arch-design.md` の「ドメイン方針」（Api だけが CORS で Viewer の origin を許可する、と書いてある）に、viewer は auth の `get-session` も同じく `credentials: "include"` で呼ぶので、auth も `trustedOrigins` の origin だけを CORS で許可する、という 1 文を足す。ほかの記述は変えない
- CORS の `allowMethods` は Hono の既定のままにする（api の CORS と同じ。viewer は今は GET だけを呼ぶが、ログアウトを足すときに POST が要るので、今は絞らない）
