# フェーズ 16 api-query（project）

- ゴール: project の query hook が使える
- 前提フェーズ: 11, 15
- 完了条件: `bun run --cwd packages/api-query type-check` が通る。`mise run format` の後に `mise run lint` が通る
- 担当: README のファイルの表でフェーズ 16 の行（`packages/api-query` だけ）。signature は README の関数の木の【16】の行、規約は README の「api-query の置き方」にある

## このフェーズの決まり

- フェーズ 15 の query hook と同じ形で足す。viewer が使うのは `project` だけだが、response の `url` もそのまま通す（hook は response を加工しない）
