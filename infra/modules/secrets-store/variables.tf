variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "store_id" {
  description = "ID of the account's Cloudflare Secrets Store (one per account, provisioned out-of-band)"
  type        = string
}

variable "karibari_auth_better_auth_secret" {
  description = "Better Auth secret read by the karibari-auth Worker via the BETTER_AUTH_SECRET binding"
  type        = string
  sensitive   = true
}

variable "karibari_auth_github_client_id" {
  description = "GitHub OAuth client ID read by the karibari-auth Worker via the GITHUB_CLIENT_ID binding"
  type        = string
  sensitive   = true
}

variable "karibari_auth_github_client_secret" {
  description = "GitHub OAuth client secret read by the karibari-auth Worker via the GITHUB_CLIENT_SECRET binding"
  type        = string
  sensitive   = true
}

variable "karibari_remote_mcp_client_secret" {
  description = "Confidential client secret read by the karibari-remote-mcp Worker for token exchange (RFC 8693) with karibari-auth"
  type        = string
  sensitive   = true
}
