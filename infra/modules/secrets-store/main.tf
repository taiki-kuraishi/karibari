# Read by the karibari-auth Worker through the BETTER_AUTH_SECRET binding.
# The value lives in Secrets Manager (URA_KARIBARI_BETTER_AUTH_SECRET); fnox exec passes it.
resource "cloudflare_secrets_store_secret" "karibari_auth_secret" {
  account_id = var.account_id
  store_id   = var.store_id
  name       = "karibari-auth-secret"
  value      = var.karibari_auth_better_auth_secret
  scopes     = ["workers"]
}

# Read by the karibari-auth Worker through the GITHUB_CLIENT_ID binding.
# The value lives in Secrets Manager (URA_KARIBARI_GITHUB_CLIENT_ID); fnox exec passes it.
resource "cloudflare_secrets_store_secret" "karibari_github_client_id" {
  account_id = var.account_id
  store_id   = var.store_id
  name       = "karibari-github-client-id"
  value      = var.karibari_auth_github_client_id
  scopes     = ["workers"]
}

# Read by the karibari-auth Worker through the GITHUB_CLIENT_SECRET binding.
# The value lives in Secrets Manager (URA_KARIBARI_GITHUB_CLIENT_SECRET); fnox exec passes it.
resource "cloudflare_secrets_store_secret" "karibari_github_client_secret" {
  account_id = var.account_id
  store_id   = var.store_id
  name       = "karibari-github-client-secret"
  value      = var.karibari_auth_github_client_secret
  scopes     = ["workers"]
}

# The confidential client's client_secret the karibari-remote-mcp Worker uses for token
# exchange (RFC 8693) with auth.
# The value lives in Secrets Manager (URA_KARIBARI_REMOTE_MCP_CLIENT_SECRET); fnox exec passes it.
resource "cloudflare_secrets_store_secret" "karibari_remote_mcp_client_secret" {
  account_id = var.account_id
  store_id   = var.store_id
  name       = "karibari-remote-mcp-client-secret"
  value      = var.karibari_remote_mcp_client_secret
  scopes     = ["workers"]
}
