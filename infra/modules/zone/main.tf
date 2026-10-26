# Zone of the domain bought through Cloudflare Registrar. Destroying it loses the domain, so it is protected.
resource "cloudflare_zone" "karibari" {
  account = {
    id = var.account_id
  }
  name = var.zone_name

  lifecycle {
    prevent_destroy = true
  }
}

resource "cloudflare_zone_setting" "ssl" {
  zone_id    = cloudflare_zone.karibari.id
  setting_id = "ssl"
  value      = "strict"
}

resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = cloudflare_zone.karibari.id
  setting_id = "always_use_https"
  value      = "on"
}
