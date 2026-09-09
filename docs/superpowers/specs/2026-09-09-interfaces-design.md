# インターフェース定義 spec（interfaces-design）

## 目的
- 各componentが公開するinterface/APIを定義する（Static Viewer / Api / MCP / Auth / 横断）

## 参照元Spec
- `docs/superpowers/specs/2026-09-09-overall-arch-design.md`（3デプロイ単位: Api+Static同居・MCP・Auth、D1×2、R2単一+prefix、書込みApi集約、検証Auth集約、エラー一律404、テスト厚め）

## Static Viewer

### SPAルート（合意済み）
- `GET /` → 一覧/案内
- `GET /p/:projectId` → Viewer本体
  - `?v=<versionId>` 任意（なし=最新）
  - `?invite=<token>` 任意
  - `?exp=<unix秒>&sig=<hmac>` 任意（署名付き）
- `401/403/404` → 同一404画面（区別しない）
