resource "cloudflare_d1_database" "karibari_auth" {
  account_id = var.account_id
  name       = "karibari-auth-database"

  read_replication = {
    mode = "disabled"
  }
}
