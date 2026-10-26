output "secret_arns" {
  description = "ARNs of the Secrets Manager secrets that the terraform plan role reads"
  value = [
    aws_secretsmanager_secret.cloudflare_api_token.arn,
    aws_secretsmanager_secret.karibari_auth_better_auth_secret.arn,
    aws_secretsmanager_secret.karibari_auth_github_client_id.arn,
    aws_secretsmanager_secret.karibari_auth_github_client_secret.arn,
    aws_secretsmanager_secret.karibari_remote_mcp_client_secret.arn,
  ]
}
