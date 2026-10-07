# インターフェース定義 spec（interfaces-design）

## 目的
- 各componentが公開するinterface/APIを定義する（Static Viewer / Api / MCP / Auth / 横断）
- 実装状況：招待・署名付きURL・公開範囲のOR判定・共有の発行（`POST /api/projects/:id/shares`）・Authの`POST /verify-access`・サインアップの制限・404の内訳のログは未実装で、計画として残す。今の公開範囲の判定は、Apiが行う所有者の判定だけ

## 参照元Spec
- `docs/superpowers/specs/2026-09-09-overall-arch-design.md`（4デプロイ単位: Viewer・Api・MCP・Auth（Viewerは静的assetsだけの別Worker）、D1×2、R2単一+prefix、書込みApi集約、本人確認はApiが自分で行う、エラー一律404、テスト厚め）

## Static Viewer

### SPAルート（合意済み）
- `GET /` → 一覧/案内（未ログイン時はログイン画面へ遷移）
- ログイン画面はAuth側で集約（Viewer内に`/login`は持たない）
- `GET /p/:projectId` → Viewer本体
  - `?v=<versionId>` 任意（なし=`versions`の並びの最後の行。「公開API versions」）
  - `?invite=<token>` 任意
  - `?exp=<unix秒>&sig=<hmac>` 任意（署名付き）
- `401/403/404` → 同一404画面（区別しない）。例外はセッションが無いとき（未ログイン）で、`/`と`/p/:projectId`のどちらでもAuthのサインイン（`<authのorigin>/sign-in?callbackURL=<encodeURIComponent(今のページのURL)>`）へ移動し、サインインの後は開いたURLへ戻る。セッションの有無は`GET /api/session`で確かめる。セッションが無いことはprojectの有無と関係ないので、存在は漏れない
- セッション・招待・署名の併用時は、いずれか一つでも有効なら表示（OR判定）

## Api

### 公開APIの資源分割（合意済み）
- `projects` / `versions` / `comments` / `shares` を別URLの資源に分ける
- R2取得（HTML実体）はApi経由のみ（R2直接公開なし）
- 資源とは別に、Viewerが未ログインを判定するための`GET /api/session`を持つ
  - 認証：必須（Cookieのセッションか Bearer。判定は他のAPIと同じ認証のmiddleware）
  - 入力：なし
  - 出力：200 `{ userId }`（auth用D1の`user.id`）／404 セッションが無い
  - Viewerからauthのget-sessionを直接呼ばないのは、Authにviewer向けのCORSが要り、確かめたいのが「Apiが受け付けるか」だから

### 公開API projects（合意済み）
- `GET /api/projects`（自分の案件一覧、要セッション）
- `POST /api/projects`（新規作成、要セッション）
  - 入力：HTML必須＋名前任意
  - 出力：案件id＋初期版id＋表示URL（絶対URL: `<Viewerのorigin>/p/:id`。LLMが返したリンクをそのまま開けるため。originはApiの`VIEWER_ORIGIN`）
- `GET /api/projects/:id`（単体取得、公開範囲判定あり：セッション/招待/署名のOR。招待・署名・ORは未実装で、今は所有者のみ）

### 公開API versions（合意済み）
- `GET /api/projects/:id/versions`（版一覧。`versions`の並びで返す）
- `POST /api/projects/:id/versions`（新規版追加、HTML実体つき。足した行の`created_at`で`projects.updated_at`も更新する。`GET /api/projects`が`updated_at`の新しい順に並べるため）
  - 入力：HTML必須
  - 出力：新版id＋表示URL（絶対URL: `<Viewerのorigin>/p/:id?v=:vid`）
- `GET /api/projects/:id/versions/:vid`（版meta取得）
- `GET /api/projects/:id/versions/:vid/content`（HTML実体取得、R2経由。`Content-Security-Policy: sandbox allow-scripts`と`X-Content-Type-Options: nosniff`を付ける。LLMが書いたHTMLのスクリプトをopaque originで動かし、cookieもApiへの認証付きrequestも持たせないため。Viewerのiframeの`sandbox`属性も`allow-scripts`にする）
- いずれも公開範囲判定あり（セッション/招待/署名のOR。招待・署名・ORは未実装で、今は所有者のみ）
- `versions`の並び：同じ`project_id`の行を挿入した順（SQLiteの暗黙の`rowid`順。カラムは足さない）。`created_at`は秒単位で`id`はランダムなUUIDなので、どちらでも同じ秒に入った行の順は決まらない。`?v`なしのときに使う行（Viewerの表示、`GET /api/projects/:id/comments`）は、この並びの最後の行
- 編集は上書きせず新version追加（HTML不変版を維持）

### 公開API comments（合意済み）
- `GET /api/projects/:id/comments?v=:vid`（指定版のコメント一覧。`v`なしは`versions`の並びの最後の行）
- `POST /api/projects/:id/comments`（要素単位コメントの保存、対象版＋要素指定つき）
  - 入力：対象版id＋要素指定＋本文必須
  - 出力：コメントid
- いずれも公開範囲判定あり（セッション/招待/署名のOR。招待・署名・ORは未実装で、今は所有者のみ）

### 公開API shares（合意済み）
- `GET /api/projects/:id/shares`（公開設定一覧、要セッション・所有者のみ）
- `POST /api/projects/:id/shares`（未実装。公開範囲設定・招待発行・署名発行、要セッション・所有者のみ）
  - 入力：種別（公開範囲設定／招待発行／署名発行のいずれか）＋対象指定
  - 出力：共有id＋招待ならトークン付きURL（`?invite=`）、署名なら署名付きURL（`?exp=&sig=`）
- `DELETE /api/projects/:id/shares/:sid`（失効、要セッション・所有者のみ）

### 内部API（合意済み：持たない）
- `/internal/*`は持たない（当初のoverall-archの内部API集約からの変更点）
- MCPも公開`/api/*`を利用する

### MCP認証（合意済み）
- MCPは利用者のOAuthアクセストークンを`Authorization: Bearer`でApiに転送する
- Apiが本人確認を自分で行う（`apps/api/src/middlewares/auth.ts`）。Bearerはauthのjwksと`aud`で検証し、Cookieはauthのget-sessionに問い合わせる。所有者の判定もApiが行う（各routeで`projects.owner`と比較）。招待・署名付きURLの判定は未実装
- 転送維持の条件：Authはaudにapiを含むトークンを発行し、Api側でもaud検証する（confused deputy回避）

## MCP

### ツール一覧（合意済み）
- 入稿 → `POST /api/projects`（＋初期版）
- 編集 → `POST /api/projects/:id/versions`（新version追加、不変版維持）
- コメント保存 → `POST /api/projects/:id/comments`
- コメント取得 → `GET /api/projects/:id/comments?v=:vid`
- 公開URL取得 → `GET /api/projects/:id`＋shares状態から表示用URL（絶対URL: `<Viewerのorigin>/p/:id`＋`?v=`）を組み立て。`?invite=`/`?exp=&sig=`の組み立ては未実装（今はsharesの件数`shareCount`を返すだけ）
- 一覧 → `GET /api/projects`（`list_projects`）

### 入出力スキーマ（合意済み）
- 対応Apiに準拠（入稿・編集・コメント保存・取得は対応Apiと同一、公開URL取得の出力は表示URL）

## Auth

### 検証口（合意済み）
- `POST /verify-access`（Auth Worker、外部非公開、Api→Auth専用）
- pathのみ`/internal/verify-access`から変更。判定分担はB案（次項）
- 未実装。今の本人確認はApiが自分で行う（「MCP認証」）。verify-accessの役割は共有の機能を作るときに決める

### 判定分担（合意済み：B案）
- meta用D1は共有しない（Api専用）
- Authは本人性・署名正当性のみ返す（auth用D1＋Secretsのみ参照、meta用D1は見ない）
- 招待の有効性・所有関係などmeta判定はApi側で行う（当初のoverall-archのAuth集約からの変更点）

### 検証口の入出力（合意済み：B案対応）
- 入力：`projectId`＋任意で`versionId`、`session`（Cookie/OAuth由来）、`exp`・`sig`（`invite`はApi側判定のためAuthに送らない）
- 出力：本人性・署名正当性を種類別に返す（単一`ok`ではない。Apiが招待・所有関係とOR結合する。理由の詳細は返さずサーバログ側に残す）

### Cookie・登録方針（合意済み）
- Cookieは`httpOnly`・`Secure`・`SameSite=Lax`
- サインアップは開放せず招待制・管理者作成のみ（未実装。今はGitHubでサインインすれば誰でも利用者になれる）
- ログイン手段にOAuthを追加

### 信頼オリジン（合意済み）
- Authの信頼オリジンはViewerの`https://karibari.tsar-bmb.org`だけ（`packages/better-auth/src/auth.ts`の`trustedOrigins`）

### 標準エンドポイント（合意済み）
- better-authの標準エンドポイントは既定のまま。標準のほかに、`GET /api/callback-url`（サインイン後の戻り先の検証）と`/.well-known/oauth-authorization-server/api/auth`がある（`POST /verify-access`は未実装）

## 横断

### 署名付きURL形式（合意済み）
- クエリ：`?exp=<unix秒>&sig=<hmac>`
- HMAC対象文字列：`projectId`＋`versionId`＋`exp`（鍵本体はSecrets管理、shares側は鍵IDのみ）

### 招待トークン形式（合意済み）
- 不透明なランダム文字列（推測不可、sharesに保存、失効・再発行可）

### エラーレスポンス形状（合意済み）
- HTTPは一律`404`、ボディは`{ "error": "not_found" }`固定（理由の区別なし）
- 内訳（`not_found`／`forbidden`／`expired`／`invalid_sig`／`r2_missing`／`auth_unavailable`）はサーバログのみに残す（未実装。今は認証のmiddlewareが`auth_unavailable`をログに出すだけ）

### D1/R2バインド（合意済み）
- meta用D1：Api専用（共有しない。projects/versions/comments/shares）
- auth用D1：Auth専用
- R2：Api経由のみ（直接公開なし）
- MCP：D1/R2直接なし（Api経由のみ）
- remote-mcp：DPoPの再利用防止にKV（`DPOP_REPLAY`）を持つ

### R2キー形式（合意済み）
- `projects/{id}/versions/{v}/`（単一バケット＋prefix、latestエイリアスなし）
