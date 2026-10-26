# infra/

Terraform for the Cloudflare and AWS resources karibari's Workers depend on. Moved here
from the archived `taiki-kuraishi/ura-karibari` repository; resource names keep its
`ura-karibari` naming because renaming would recreate live resources.

- Not managed here: Worker deployments (api / auth / remote-mcp / viewer), DNS records
  (created by wrangler's `custom_domain`), the GitHub OAuth App, the meta D1, and R2.
- `apps/*/wrangler.jsonc` hardcodes the IDs and names of the managed resources. When a
  resource is recreated or renamed here, update those `wrangler.jsonc` files in the same
  change.

## Layout

- `env/<env>/` is the apply unit (only `prod`). Resources live in `modules/<resource>/`.
- Module files: `main.tf` / `variables.tf` / `output.tf` (only when the module passes
  values on) / `version.tf`. Import blocks for resources created outside terraform go in
  the root module's `imports.tf`.
- The root `outputs.tf` stays empty; tflint's `terraform_standard_module_structure`
  requires it. Read values with `terraform state pull | jq` instead of adding outputs.
- Commit `.terraform.lock.hcl`.
- Prefix Cloudflare resource names with `karibari-`.
- The personal AWS account is shared with other repositories, so names mark ownership:
  Secrets Manager secrets use the `URA_KARIBARI_` prefix.

## Commands

Log in first: the S3 state, the aws provider, fnox, and tflint's aws `deep_check` all use
AWS credentials.

```bash
mise exec -- aws sso login --profile kuraishi
mise run terraform:init   # terraform init + tflint --init
mise run terraform:plan   # fnox injects secrets as env
mise run terraform:apply
mise run lint:terraform   # fmt -check, validate, tflint
```

- `mise run format` includes `terraform fmt`.
- Apply locally and merge only once plan shows No changes. CI's `terraform` job runs plan
  with `-detailed-exitcode` on every PR and push to main, so pending changes or drift fail it.
- CI borrows `terraform-plan-ura-karibari` through GitHub OIDC; its trust policy lives in the
  taiki-kuraishi/personal repo and must list this repo's `pull_request` and `refs/heads/main`
  subjects. CI reads state through the read-only role in `env/prod/ci.s3.tfbackend`.
- Secrets live in the personal account's Secrets Manager; `fnox exec` passes them as env.
  Never write them to disk or commit them. Change one with
  `mise exec -- fnox set <KEY> --provider aws` (`<KEY>` is a key under `[secrets]` in
  `fnox.toml`; the value is read from a hidden prompt).
- Prefix direct commands that bypass mise tasks with `mise exec --`.
- When bumping a provider, update `env/prod/version.tf` and `.terraform.lock.hcl` together.
