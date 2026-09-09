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
- `GET /api/projects/:id`（単体取得、公開範囲判定あり：セッション/招待/署名のOR）
