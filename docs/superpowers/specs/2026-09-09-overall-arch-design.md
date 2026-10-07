# 全体設計 spec（overall-arch）

## 目的
- LLMがMCP経由でHTMLを入稿 → URL共有 → 要素ごとにコメント → 修正を回す、自前運用できるOSS（karibari / 仮貼り）を作る
- Claude Design相当の「作る→見せる→直す」を自分の手元で回せるようにする
- 被らない核は「自前運用できるOSS」であること

## スコープ外（初版でやらない）
- リアルタイム同時編集
- UI内蔵LLMチャット・課金

## 要件（合意済み）
- MCP経由で htmlの入稿 / 編集 / コメント に対応する
- Viewer側はURL共有、要素単位コメント、HTML編集ができること
- URLの公開範囲を設定できることが必須（自分だけ / 招待 / 署名付きURLでURLを知っている人だけ、の方針）
- Cloudflare host前提（Workers + R2 + D1想定）
- 方向性はシンプル自前版: UI配信とMCP、R2にHTML不変バージョン、D1にmeta管理

## 設計
### Worker分割方針
- 方針: 責務分離を優先する
- 構成: 4 Worker（`apps/`配下のデプロイ単位。それぞれ別のカスタムドメイン）。共有コードは`packages/`の内部パッケージに置く
  - apps/viewer（`karibari.tsar-bmb.org`）: SPA（bun＋Vite）。`main`の無い静的assetsだけのWorkerで、`not_found_handling`は`single-page-application`。どのpathもclient-side routerが受け、Apiは別オリジンとして呼ぶ
  - apps/api（`api.karibari.tsar-bmb.org`）: Viewer用API + R2取得。MCPも同じ公開APIを使う。assetsは持たない。meta用D1とR2の書込み口。本人確認と所有者の判定は自分で行う（「公開範囲検証」）
  - apps/remote-mcp（`mcp.karibari.tsar-bmb.org`）: html入稿 / 編集 / コメントのMCP受け口。ツールは`packages/mcp`に分ける
  - apps/auth（`auth.karibari.tsar-bmb.org`）: better-auth（user/session管理）。auth用D1だけを持つ。サインインなどの画面（SPA）をassetsで同居させる。公開範囲の判定を担う`POST /verify-access`は未実装（「公開範囲検証」）
- MCP Workerは所有者の判定を持たない。アクセストークンを検証してBearerをApiへ転送し、本人確認と所有者の判定はApiが行う
- ドメイン方針: 4 Workerは別オリジンだが、同じsite（`tsar-bmb.org`）に置く。ViewerのSPAはApiを`credentials: "include"`で呼び、ApiはCORSでViewerのorigin（`VIEWER_ORIGIN`）だけを許可する。セッションのCookieは`karibari.tsar-bmb.org`をdomainにして、各サブドメインで共有する（better-authの`crossSubDomainCookies`）

### D1分担
- D1を2つに分ける（meta用 / auth用）
  - meta用D1: projects、versions、comments、shares（公開範囲・招待・署名）などのmeta管理
  - auth用D1: better-auth系テーブル（ユーザー・セッションなど）の管理。招待はauth用D1ではなく、meta用D1の`shares.token`に持つ（db-packageのspecと同じ）
- 境界とバックアップ単位を明確にする目的。単一D1同居より運用は少し重くなる点は許容する
- Authはmeta用D1を読まない（`apps/auth/wrangler.jsonc`のD1はauth用だけ）。meta用D1を読み書きするのはApiだけ（interfaces-designの「判定分担」と同じ）

### R2分担
- 単一バケット + prefix（例: projects/{id}/versions/{v}/）でHTML不変バージョンを保存する
- R2は直接公開せず、Api Worker経由でのみ取得する
- latestエイリアス等は持たず、参照すべきバージョンはmeta用D1が持つ方向

### 書込み経路
- 書込み口はApi側の公開API（`/api/*`）に集約する。`/internal/*`は無い
- MCP WorkerはR2/D1に直接書かず、公開の`/api/*`をBearerで呼んでApiに書かせる（R2/D1への書込み口を1つにする）
- 境界を堅くする目的。初版から一手間増える点は許容する

### 公開範囲検証（本人確認はApi）
- 方針: 本人確認はApiが自分で行う（`apps/api/src/middlewares/auth.ts`）。Cookieはauthのget-sessionに問い合わせ、Bearerはauthのjwksと`aud`で検証する。所有者の判定もApiが行う（各routeで`projects.owner`と比較）。招待・署名付きURLの判定は未実装
- 自分だけ: Api→Authにセッション照会（Bearerはjwks検証）→Apiが`projects.owner`と比較→OKならApiがR2取得
- 招待（未実装）: Apiが招待トークンをmeta用D1の`shares.token`で確認（セッションがあれば併せて確認）→OKならApiがR2取得
- 署名付きURL（未実装）: Api→Authに`exp`/`sig`転送→AuthがHMAC再計算＋期限確認→OKならApiがR2取得。毎回Auth往復になる点とAuth停止時は全表示停止になる点は許容する
- Authの`POST /verify-access`（未実装）: 今の本人確認はApiが行っており、verify-accessの役割は共有の機能を作るときに決める（interfaces-designの「検証口」）
- better-auth設定方針: DBはauth用D1、Cookieは`httpOnly・Secure・SameSite=Lax`、サインアップは開放せず招待制・管理者作成のみ（未実装。今はGitHubでサインインすれば誰でも利用者になれる）。署名用HMAC鍵本体はSecrets管理とし、shares側には鍵IDのみ持つ

## エラー処理
- 方針: 存在の有無を推測させないため、ない・権限なし・失効はすべて404に寄せる（fail closed、詳細は出さない）
  - 対象: 存在しないproject/version、権限なし、自分だけ・招待・署名の失効・不一致（期限切れ・署名不一致・招待無効）
  - R2欠損（metaはあるが実体なし）・Auth判定不可（停止・タイムアウト）も404に寄せ、内訳はログのみに残す
- ログ: 内訳（not_found / forbidden / expired / invalid_sig / r2_missing / auth_unavailable）はサーバ側ログに残し（未実装。今は認証のmiddlewareが`auth_unavailable`をログに出すだけ）、レスポンスボディは`{ "error": "not_found" }`で一律にする

## テスト方針
- 方針: 初版から自動を厚めにする（E2E・境界値まで自動化。速度より安心を取る）
  - 公開範囲3種（自分だけ / 招待 / 署名付きURL）の可否マトリクス
  - ない・権限なし・失効・R2欠損・Auth判定不可の一律404化
  - 入稿→新version追加→表示、要素単位コメントの保存・取得、HTML編集の新version化
  - 署名の境界値（期限切れ・1秒前後・改ざん・別version流用）、招待の失効・再発行
  - 手動確認はViewerの見た目・操作感のみに寄せる
