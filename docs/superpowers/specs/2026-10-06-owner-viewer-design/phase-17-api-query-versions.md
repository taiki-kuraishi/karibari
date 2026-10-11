# フェーズ 17 api-query（versions の一覧）

- ゴール: versions の一覧の query hook が使える
- 前提フェーズ: 8, 15
- 完了条件: `bun run --cwd packages/api-query type-check` が通る。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 17 の行（`packages/api-query` だけ）。signature は README の関数の木の【17】の行、規約は README の「api-query の置き方」にある

## このフェーズの決まり

- フェーズ 15 の query hook と同じ形で足す。並び（挿入した順）は api が決めるので、hook は並べ替えない
