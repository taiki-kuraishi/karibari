# karibari

Self-hostable OSS for sharing HTML mockups via URL and iterating with element-level comments, driven through MCP (karibari / 仮貼り).

## Develop

Requires [mise](https://mise.jdx.dev). Run `mise trust` once per clone — mise refuses to
load a `mise.toml` it has not seen before.

```bash
mise trust
mise run install   # mise install, bun install, lefthook install
mise run lint      # bun.lock drift, oxlint, oxfmt --check, tsc, knip, terraform (*)
mise run test
```

(*) The terraform check needs AWS credentials and `mise run terraform:init` first.

CI runs the same gate; see `.github/AGENTS.md`.

`infra/` holds the Terraform for the Cloudflare and AWS resources; see `infra/AGENTS.md`.
