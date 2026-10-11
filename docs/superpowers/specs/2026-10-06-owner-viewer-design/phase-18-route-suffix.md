# フェーズ 18 api の route の export 名

- ゴール: `apps/api` の route の export 名が、`AGENTS.md` の命名（route は `Route` 終わり、middleware は `Middleware` 終わり）に合う
- 前提フェーズ: 11（`apps/api/src/routes/projects/[project_id]/index.get.ts` を同じく触るので、merge の順だけの前提）
- 完了条件: `bun run --cwd apps/api test` が通る。`mise run format` の後に `mise run lint`（type-check を含む）が通る。`apps/api/src/client.ts` の型を使う `packages/mcp` と `apps/viewer` の type-check も通る（`bunx vp run -r type-check`）
- 担当: README のファイルの表でフェーズ 18 の行（`apps/api` だけ）

## このフェーズの決まり

- 名前だけの変更にする。今の export 名（`getProjects`・`postProjectVersions` など、HTTP の method の接頭辞で始まる名前）の末尾に `Route` を足す。ファイルの path・Hono の chain の順序・RPC の型・挙動は変えない
- middleware は今すでに `Middleware` 終わりなので変えない。`apps/auth` と `apps/remote-mcp` の route もすでに `Route` 終わりなので変えない
- `apps/api/src/server.ts` の Hono の chain を途中で切らない（切ると RPC の型の推論が失われる）
