# Values are written with `fnox set`, never passed to terraform, so they stay out of state.
# The personal account is shared with other repos, hence the URA_KARIBARI_ prefix.
resource "aws_secretsmanager_secret" "cloudflare_api_token" {
  name = "URA_KARIBARI_CLOUDFLARE_API_TOKEN"
}

resource "aws_secretsmanager_secret" "karibari_auth_better_auth_secret" {
  name = "URA_KARIBARI_BETTER_AUTH_SECRET"
}

resource "aws_secretsmanager_secret" "karibari_auth_github_client_id" {
  name = "URA_KARIBARI_GITHUB_CLIENT_ID"
}

resource "aws_secretsmanager_secret" "karibari_auth_github_client_secret" {
  name = "URA_KARIBARI_GITHUB_CLIENT_SECRET"
}

resource "aws_secretsmanager_secret" "karibari_remote_mcp_client_secret" {
  name = "URA_KARIBARI_REMOTE_MCP_CLIENT_SECRET"
}
