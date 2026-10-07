# フェーズ 15 api-query（provider と projects の一覧）

- ゴール: `packages/api-query` ができ、projects の一覧の query hook が使える
- 前提フェーズ: 19
- 完了条件: `bun run --cwd packages/api-query type-check` が通る。`mise run format` の後に `mise run lint`（knip を含む）が通る。`bun dedupe --check` が通る
- 担当: README のファイルの表でフェーズ 15 の行（`packages/api-query` と、付いてくる root の `AGENTS.md`・`knip.config.ts`・`bun.lock`）。signature は README の関数の木の【15】の行、規約は README の「api-query の置き方」にある

## このフェーズの決まり

- package の登録は `.claude/rules/workspace-packages.md` に従う。テストは書かないので CI の test の matrix には入れず、`type-check` は全 workspace に要るので script を持つ
- 依存と `tsconfig.json` の作りは、`packages/mcp`（同じく api の client の型を使う source-only の package）を参考にする
- `packages/api-query/AGENTS.md` には、README の「api-query の置き方」の規約を、この package に向けて書く。`CLAUDE.md` は `@AGENTS.md` だけにする。root の `AGENTS.md` の Directory rules の表に、この package の行を足す
- 確認として、使い捨てのコードで次を確かめる（確認用のコードは残さない）。`projects の一覧の query hook` の `data` が `{ projects } | null` に推論されること。provider の外で `api の client を取る hook` を呼ぶと例外になること
