module "karibari_d1" {
  source     = "../../modules/d1"
  account_id = var.cloudflare_account_id
}

module "karibari_kv" {
  source     = "../../modules/kv"
  account_id = var.cloudflare_account_id
}

module "karibari_zone" {
  source     = "../../modules/zone"
  account_id = var.cloudflare_account_id
  zone_name  = var.cloudflare_zone_name
}

module "karibari_secrets_store" {
  source     = "../../modules/secrets-store"
  account_id = var.cloudflare_account_id
  store_id   = var.cloudflare_secrets_store_id

  karibari_auth_better_auth_secret   = var.karibari_auth_better_auth_secret
  karibari_auth_github_client_id     = var.karibari_auth_github_client_id
  karibari_auth_github_client_secret = var.karibari_auth_github_client_secret
  karibari_remote_mcp_client_secret  = var.karibari_remote_mcp_client_secret
}

module "karibari_secrets_manager" {
  source = "../../modules/secrets-manager"
}

module "karibari_iam" {
  source = "../../modules/iam"

  terraform_plan_role_name           = var.terraform_plan_role_name
  management_terraform_plan_role_arn = var.management_terraform_plan_role_arn
  secret_arns                        = module.karibari_secrets_manager.secret_arns
}
