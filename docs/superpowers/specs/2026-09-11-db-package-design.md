# db-package 設計 spec

## 目的

- `ax/aeo/packages/db` を参考に、karibari 用の DB schema 定義と migration 生成を行う package を新設する。
- 対象は meta 用 D1（`projects` / `versions` / `comments` / `shares`）の schema と migration 生成。

## スコープ

- 含む: schema 定義（Drizzle DSL）＋ `drizzle-kit generate` による migration 生成物＋ Drizzle ランタイムクライアント。
- 含まない: Kysely ランタイム、自作 dialect（TursoDialect 相当）、Turso/sqld 用テストハーネス。D1 binding の worker 配線は別 wave。

## エラー処理

- 生成時は素の `drizzle-kit generate` のみ（check ラッパーなし）。壊れたチェーンの検出は drift gate に任せる。

## テスト方針

- `type-check`＋ drift gate（CI で `generate` し直して差分ゼロを確認）。sqld/Turso 系ハーネスは持たない。

## 要件

- 出所: 4 テーブルのカラム定義は既存 spec（overall-arch 等）からの抽出＋ ax 規約の既定値で補完した案を承認済み。
- 規約: text 主キー、snake_case キー、時刻は epoch 秒 integer（timestamp モード禁止）、FK は inline `.references()`、`relations()` なし、1 テーブル 1 ファイル（`src/schemas/`＋ barrel）。
- `projects`: `id` TEXT PK、`name` TEXT NULL 可、`owner` TEXT NOT NULL（auth-D1 user id。DB 跨ぎのため FK なし）、`created_at` / `updated_at` INTEGER epoch 秒 NOT NULL。
- `versions`: `id` TEXT PK（R2 の `{v}` セグメントに再利用。独立した version 番号列は持たない）、`project_id` TEXT NOT NULL → `projects.id`、`created_at` INTEGER NOT NULL。HTML 本体は R2 に置き列にしない。不変性は運用ルール。
- `comments`: `id` TEXT PK、`project_id` TEXT NOT NULL → `projects.id`、`version_id` TEXT NOT NULL → `versions.id`、`target` TEXT NOT NULL（要素指定の opaque セレクタ）、`body` TEXT NOT NULL、`created_at` INTEGER NOT NULL。
- `shares`: `id` TEXT PK、`project_id` TEXT NOT NULL → `projects.id`、`kind` TEXT NOT NULL（`private` / `invite` / `signed`）、`token` TEXT NULL 可 UNIQUE（invite 用）、`key_id` TEXT NULL 可（signed 用。鍵本体は Secrets）、失効は行削除（DELETE＝失効）。`exp` は URL に載せ保存しない。`target` の版スコープ指定は持たない（署名対象の version は URL の `?v=` で運ぶ）。
- index: `versions(project_id)`、`comments(project_id, version_id)`、`shares(project_id)`、`shares(token)` UNIQUE。

## 設計

- 配置・形式: ハイブリッド（ax の 1 テーブル 1 ファイル作法＋ karibari 流の `sqlite` / `src/migrations`）。
- クライアント: Drizzle only（D1 向け。driver 選定は plan で）。Kysely は入れない。

## 決定事項

- topic / branch 名: `db-package`
- package 名: `@karibari/db`
- 置き場: `packages/` 配下の source-only workspace（`@karibari/better-auth` と同形）。
