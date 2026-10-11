# フェーズ 5 spec

- ゴール: `docs/superpowers/specs/` の spec が、今の実装とこの設計に合っている。まだ作っていない計画は計画として残っている
- 前提フェーズ: なし（spec は設計の意図を書く文書なので、コードのフェーズの merge を待たない）
- 完了条件: 下の「直すもの」がすべて反映され、「残すもの」が消えていない。`tk-stack-drift-review` を使う subagent に 4 つの spec を今のコードとこの設計書に突き合わせさせ、「直すもの」に当たるずれが残っていない。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 5 の行

## このフェーズの決まり

- 書き換えるのは、今の実装と違う記述と、この設計で変わる記述だけ。spec の節の構成と日付は変えない
- `docs/superpowers/plans/` は当時の作業の記録なので変えない
- `2026-09-11-db-package-design.md` は実装と一致しているので変えない

## 直すもの（今の実装に合わせる）

行番号は 2026-10-06 時点。

- overall-arch `:22-28`: 構成は 4 Worker（`apps/api`・`apps/auth`・`apps/remote-mcp`・`apps/viewer`）で、それぞれ別のカスタムドメイン（`api.`・`auth.`・`mcp.`・apex の `karibari.tsar-bmb.org`）。viewer は `main` の無い静的 assets だけの Worker で、api は assets を持たない。MCP は受け口の `apps/remote-mcp` とツールの `packages/mcp` に分かれる
- overall-arch `:26-27`・`:47-52`・interfaces `:62-65`: 本人確認は api が自分で行う。cookie は auth の get-session に問い合わせ、Bearer は auth の JWKS と `aud` で検証する（`apps/api/src/middlewares/auth.ts`）。所有者の判定も api が `projects.owner` で行う（各 route の `projects.owner` との比較）。招待・署名付き URL の判定は未実装と併記する
- overall-arch `:35`: auth は meta 用 D1 を読まない（`apps/auth/wrangler.jsonc` の D1 は auth 用だけ）。interfaces `:86-88` の判定分担と同じにする
- interfaces `:7`: 参照元の要約（「3デプロイ単位: Api+Static同居・MCP・Auth」「検証Auth集約」）を、上の構成と本人確認に合わせる
- overall-arch `:33`: 招待は auth 用 D1 ではなく、meta 用 D1 の `shares.token` に持つ（db-package の spec と同じ）
- overall-arch `:43-44`: `/internal/*` は無く、MCP も公開の `/api/*` を Bearer で呼ぶ（interfaces `:58-60` と同じ）
- overall-arch `:55-58`・interfaces `:115-116`: 404 の body は `{ "error": "not_found" }`
- interfaces `:100`: auth の信頼する origin は Viewer の `https://karibari.tsar-bmb.org` だけ（`packages/better-auth/src/auth.ts`）
- interfaces `:103`: better-auth の標準のほかに、`GET /api/callback-url` と `/.well-known/oauth-authorization-server/api/auth` がある
- interfaces `:69-74`: MCP のツール一覧に、一覧 → `GET /api/projects`（`list_projects`）を足す（`packages/mcp/src/index.ts` で登録済み）
- interfaces `:118-122`: この節に、remote-mcp が DPoP の再利用防止に KV（`DPOP_REPLAY`）を持つことを 1 行足す（今は記述が無い）
- tech-stack `:11`: workspace は `apps/api`・`apps/auth`・`apps/remote-mcp`・`apps/viewer` と `packages/better-auth`・`packages/db`・`packages/db-factory`・`packages/mcp`・`packages/shadcn`
- tech-stack `:16`: Hono は catalog で `4.13.7` に完全に固定している
- tech-stack `:17`: SPA の同居は auth（`run_worker_first`）だけで、viewer は assets だけ
- tech-stack `:39`: MCP は `@modelcontextprotocol/sdk` と `@better-auth/mcp` の `createMcpProtectedRequestHandler` に DPoP を使う
- tech-stack `:47`: `createTestHarness()` は無く、Worker ごとに `@cloudflare/vitest-plugin` で、画面は app ごとの Playwright で確かめる
- move-api-auth-to-apps: 移行は記録として残し、その後の変更（`apps/mcp` を `apps/remote-mcp` に改名、`packages/mcp`・`packages/db-factory`・`packages/shadcn` の追加、viewer を別 Worker にしたこと）を短く足す

## 直すもの（この設計で変わる）

README の次の節を反映する。

- 「型と API」: 表示 URL を絶対 URL にすること、`versions` の並び（`?v` が無いときは並びの最後の行。interfaces `:41` の「Api側で最新解決」を置き換える）、POST versions が `projects.updated_at` を更新すること、content の CSP を `sandbox allow-scripts` にすること（`GET /api/session` を書いた箇所は、のちに取りやめた。フェーズ 12 が直す）
- 「型と API」の get_project_url: interfaces `:74` の公開 URL 取得は、今は絶対の表示 URL と `?v=` だけで、`?invite=`・`?exp=&sig=` の組み立ては未実装と併記する
- 「画面」: `/p/:projectId` も未ログインならサインインへ送る（interfaces `:18` の「401/403/404 → 同一404画面」の例外）。セッションが無いことは project の有無と関係ないので、存在は漏れない

## 残すもの（まだ作っていない計画）

次は書き換えず、計画として残す。今の実装と並べて書くときは「未実装」と分かるようにする。

- 招待・署名付き URL・公開範囲の OR 判定・`POST /api/projects/:project_id/shares`
- auth の `POST /verify-access` とその入出力。今の本人確認は上のとおり api が行っていることを併記し、verify-access の役割をどう変えるかは共有の機能を作るときに決める（このフェーズでは決めない）
- サインアップの制限（`disableSignUp` と `databaseHooks`）
- 404 の内訳をサーバのログに残すこと
- 公開範囲・署名・招待のテスト方針
