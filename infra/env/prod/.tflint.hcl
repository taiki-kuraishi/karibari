config {
  format = "compact"
}

# Use the terraform ruleset bundled with tflint. Pinning version/source downloads the
# plugin from GitHub, and sigstore-go panicked in `tflint --init`'s signature check, so
# the bundled copy sidesteps the download entirely.
# (The aws ruleset is not bundled, so it pins version/source; tflint 0.64.0 does not panic.)
plugin "terraform" {
  enabled = true
}

plugin "aws" {
  enabled    = true
  version    = "0.48.0"
  source     = "github.com/terraform-linters/tflint-ruleset-aws"
  deep_check = true
}
