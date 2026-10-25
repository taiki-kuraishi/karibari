import {
  to = module.karibari_zone.cloudflare_zone.karibari
  id = var.cloudflare_zone_id
}

import {
  to = module.karibari_zone.cloudflare_zone_setting.ssl
  id = "${var.cloudflare_zone_id}/ssl"
}

import {
  to = module.karibari_zone.cloudflare_zone_setting.always_use_https
  id = "${var.cloudflare_zone_id}/always_use_https"
}
