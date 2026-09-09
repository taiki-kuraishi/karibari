# 技術スタック spec（tech-stack-design）

## 目的
- 実装に使う具体的な技術スタックを決める（Api枠組み / DB / Auth / MCP / テスト）

## 参照元Spec
- `docs/superpowers/specs/2026-09-09-overall-arch-design.md`
- `docs/superpowers/specs/2026-09-09-interfaces-design.md`

## Api枠組み

### ルータ（合意済み）
- Hono v4.13.7（`^4.13.7`でpin）
- SPA同居は`assets.not_found_handling: "single-page-application"`＋`run_worker_first: ["/api/*"]`

## DB

### ORM・運用（合意済み）
- drizzle-orm 0.45系（安定版、v1 RCは見送り）
- `drizzle-kit generate`→`wrangler d1 migrations apply`運用
