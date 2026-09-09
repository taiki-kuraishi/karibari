# インターフェース定義 spec（interfaces-design）

## 目的
- 各componentが公開するinterface/APIを定義する（Static Viewer / Api / MCP / Auth / 横断）

## 参照元Spec
- `docs/superpowers/specs/2026-09-09-overall-arch-design.md`（3デプロイ単位: Api+Static同居・MCP・Auth、D1×2、R2単一+prefix、書込みApi集約、検証Auth集約、エラー一律404、テスト厚め）

## Static Viewer

### SPAルート（合意済み）
- `GET /` → 一覧/案内（未ログイン時はログイン画面へ遷移）
- ログイン画面はAuth側で集約（Viewer内に`/login`は持たない）
- `GET /p/:projectId` → Viewer本体
  - `?v=<versionId>` 任意（なし=最新）
  - `?invite=<token>` 任意
  - `?exp=<unix秒>&sig=<hmac>` 任意（署名付き）
- `401/403/404` → 同一404画面（区別しない）
- セッション・招待・署名の併用時は、いずれか一つでも有効なら表示（OR判定）

## Api

### 公開APIの資源分割（合意済み）
- `projects` / `versions` / `comments` / `shares` を別URLの資源に分ける
- R2取得（HTML実体）はApi経由のみ（R2直接公開なし）

### 公開API projects（合意済み）
- `GET /api/projects`（自分の案件一覧、要セッション）
- `POST /api/projects`（新規作成、要セッション）
  - 入力：HTML必須＋名前任意
  - 出力：案件id＋初期版id＋表示URL（`/p/:id`）
- `GET /api/projects/:id`（単体取得、公開範囲判定あり：セッション/招待/署名のOR）

### 公開API versions（合意済み）
- `GET /api/projects/:id/versions`（版一覧）
- `POST /api/projects/:id/versions`（新規版追加、HTML実体つき）
  - 入力：HTML必須
  - 出力：新版id＋表示URL（`/p/:id?v=:vid`）
- `GET /api/projects/:id/versions/:vid`（版meta取得）
- `GET /api/projects/:id/versions/:vid/content`（HTML実体取得、R2経由）
- いずれも公開範囲判定あり（セッション/招待/署名のOR）。Viewerの`?v`なし=最新はApi側でmeta用D1を見て最新解決
- 編集は上書きせず新version追加（HTML不変版を維持）

### 公開API comments（合意済み）
- `GET /api/projects/:id/comments?v=:vid`（指定版のコメント一覧）
- `POST /api/projects/:id/comments`（要素単位コメントの保存、対象版＋要素指定つき）
  - 入力：対象版id＋要素指定＋本文必須
  - 出力：コメントid
- いずれも公開範囲判定あり（セッション/招待/署名のOR）

### 公開API shares（合意済み）
- `GET /api/projects/:id/shares`（公開設定一覧、要セッション・所有者のみ）
- `POST /api/projects/:id/shares`（公開範囲設定・招待発行・署名発行、要セッション・所有者のみ）
  - 入力：種別（公開範囲設定／招待発行／署名発行のいずれか）＋対象指定
  - 出力：共有id＋招待ならトークン付きURL（`?invite=`）、署名なら署名付きURL（`?exp=&sig=`）
- `DELETE /api/projects/:id/shares/:sid`（失効、要セッション・所有者のみ）

### 内部API（合意済み：持たない）
- `/internal/*`は持たない（overall-archの内部API集約からの変更点）
- MCPも公開`/api/*`を利用する

### MCP認証（合意済み）
- MCPは利用者のOAuthアクセストークンを`Authorization: Bearer`でApiに転送する
- ApiはAuthに検証させる

## MCP

### ツール一覧（合意済み）
- 入稿 → `POST /api/projects`（＋初期版）
- 編集 → `POST /api/projects/:id/versions`（新version追加、不変版維持）
- コメント保存 → `POST /api/projects/:id/comments`
- コメント取得 → `GET /api/projects/:id/comments?v=:vid`
- 公開URL取得 → `GET /api/projects/:id`＋shares状態から表示用URL（`/p/:id`＋`?v=`/`?invite=`/`?exp=&sig=`）を組み立て

### 入出力スキーマ（合意済み）
- 対応Apiに準拠（入稿・編集・コメント保存・取得は対応Apiと同一、公開URL取得の出力は表示URL）

## Auth

### 検証口（合意済み）
- `POST /verify-access`（Auth Worker、外部非公開、Api→Auth専用）
- pathのみ`/internal/verify-access`から変更。判定分担はB案（次項）

### 判定分担（合意済み：B案）
- meta用D1は共有しない（Api専用）
- Authは本人性・署名正当性のみ返す（auth用D1＋Secretsのみ参照、meta用D1は見ない）
- 招待の有効性・所有関係などmeta判定はApi側で行う（overall-archのAuth集約からの変更点）

### 検証口の入出力（合意済み：B案対応）
- 入力：`projectId`＋任意で`versionId`、`session`（Cookie/OAuth由来）、`exp`・`sig`（`invite`はApi側判定のためAuthに送らない）
- 出力：本人性・署名正当性を種類別に返す（単一`ok`ではない。Apiが招待・所有関係とOR結合する。理由の詳細は返さずサーバログ側に残す）

### Cookie・登録方針（合意済み）
- Cookieは`httpOnly`・`Secure`・`SameSite=Lax`
- サインアップは開放せず招待制・管理者作成のみ
- ログイン手段にOAuthを追加

### 信頼オリジン（合意済み）
- Authの信頼オリジンはViewer／Apiのドメインのみ許可（許可リストの具体値はデプロイ時に設定）

### 標準エンドポイント（合意済み）
- better-authの標準エンドポイントは既定のまま（追加カスタムなし、`POST /verify-access`除く）

## 横断

### 署名付きURL形式（合意済み）
- クエリ：`?exp=<unix秒>&sig=<hmac>`
- HMAC対象文字列：`projectId`＋`versionId`＋`exp`（鍵本体はSecrets管理、shares側は鍵IDのみ）

### 招待トークン形式（合意済み）
- 不透明なランダム文字列（推測不可、sharesに保存、失効・再発行可）

### エラーレスポンス形状（合意済み）
- HTTPは一律`404`、ボディは汎用文固定（理由の区別なし）
- 内訳（`not_found`／`forbidden`／`expired`／`invalid_sig`／`r2_missing`／`auth_unavailable`）はサーバログのみに残す

### D1/R2バインド（合意済み）
- meta用D1：Api専用（共有しない。projects/versions/comments/shares）
- auth用D1：Auth専用
- R2：Api経由のみ（直接公開なし）
- MCP：D1/R2直接なし（Api経由のみ）

### R2キー形式（合意済み）
- `projects/{id}/versions/{v}/`（単一バケット＋prefix、latestエイリアスなし）
