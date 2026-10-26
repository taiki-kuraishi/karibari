variable "cloudflare_account_id" {
  description = "Cloudflare account ID (personal)"
  type        = string
  default     = "bd1a33a9922e50b3afff5a2f21ad52d0"
}

# Bought through Cloudflare Registrar outside terraform, so imports.tf adopts it.
variable "cloudflare_zone_id" {
  description = "ID of the karibari.com zone"
  type        = string
  default     = "d755024ddc4a0812a5952d97914a2f16"
}

variable "cloudflare_zone_name" {
  description = "Domain name of the karibari zone"
  type        = string
  default     = "karibari.com"
}

# The account's single default Secrets Store. It was created out-of-band and cannot be
# destroyed, so terraform references it by ID instead of creating it.
variable "cloudflare_secrets_store_id" {
  description = "ID of the account's Cloudflare Secrets Store"
  type        = string
  default     = "9a2d7bd458234f29b84bff50f66669d0"
}

# The value lives in the personal account's Secrets Manager (URA_KARIBARI_BETTER_AUTH_SECRET);
# fnox exec passes it as TF_VAR_karibari_auth_better_auth_secret. No default, so a missing
# value fails plan with "No value for required variable".
variable "karibari_auth_better_auth_secret" {
  description = "Better Auth secret read by the karibari-auth Worker via the BETTER_AUTH_SECRET binding"
  type        = string
  sensitive   = true
}

# The value lives in Secrets Manager (URA_KARIBARI_GITHUB_CLIENT_ID); fnox exec passes it
# as TF_VAR_karibari_auth_github_client_id. No default.
variable "karibari_auth_github_client_id" {
  description = "GitHub OAuth client ID read by the karibari-auth Worker via the GITHUB_CLIENT_ID binding"
  type        = string
  sensitive   = true
}

# The value lives in Secrets Manager (URA_KARIBARI_GITHUB_CLIENT_SECRET); fnox exec passes it
# as TF_VAR_karibari_auth_github_client_secret. No default.
variable "karibari_auth_github_client_secret" {
  description = "GitHub OAuth client secret read by the karibari-auth Worker via the GITHUB_CLIENT_SECRET binding"
  type        = string
  sensitive   = true
}

# The value lives in Secrets Manager (URA_KARIBARI_REMOTE_MCP_CLIENT_SECRET); fnox exec passes
# it as TF_VAR_karibari_remote_mcp_client_secret. No default.
variable "karibari_remote_mcp_client_secret" {
  description = "Confidential client secret read by the karibari-remote-mcp Worker for token exchange (RFC 8693) with karibari-auth"
  type        = string
  sensitive   = true
}

# Created by taiki-kuraishi/personal's aws-organization root and shared with other repos.
variable "aws_account_id" {
  description = "ID of the personal AWS account that holds the plan role and the secrets"
  type        = string
  default     = "297580067274"
}

variable "aws_account_role_name" {
  description = "Role that the aws provider assumes in the personal AWS account. CI overrides this with the read-only plan role."
  type        = string
  default     = "OrganizationAccountAccessRole"
}

variable "terraform_plan_role_name" {
  description = "Name of the read-only role in the personal AWS account that CI uses for terraform plan"
  type        = string
  default     = "terraform-plan-ura-karibari"
}

# The management account's entry role is managed by taiki-kuraishi/personal's aws-organization root.
variable "management_terraform_plan_role_arn" {
  description = "CI plan role in the management account, the only principal trusted by the plan role"
  type        = string
  default     = "arn:aws:iam::180713304056:role/terraform-plan-ura-karibari"
}
