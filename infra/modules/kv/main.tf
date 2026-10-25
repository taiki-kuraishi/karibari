resource "cloudflare_workers_kv_namespace" "karibari_dpop_replay" {
  account_id = var.account_id
  title      = "karibari-dpop-replay"
}
