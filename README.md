# karibari

Self-hostable OSS for sharing HTML mockups via URL and iterating with element-level comments, driven through MCP (karibari / 仮貼り).

## Develop

Requires [mise](https://mise.jdx.dev). Run `mise trust` once per clone — mise refuses to
load a `mise.toml` it has not seen before.

```bash
mise trust
mise run install   # mise install, bun install, lefthook install
mise run lint      # bun.lock drift, oxlint, oxfmt --check, tsc, knip
mise run test
```

CI runs the same gate; see `.github/AGENTS.md`.
