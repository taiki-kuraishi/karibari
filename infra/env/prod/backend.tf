terraform {
  # The bucket lives in the tf-state AWS account and is created by the terraform-state root of taiki-kuraishi/personal.
  backend "s3" {
    bucket       = "kuraishi-ura-karibari-tfstate"
    key          = "env/prod/terraform.tfstate"
    region       = "ap-northeast-1"
    encrypt      = true
    use_lockfile = true

    assume_role = {
      role_arn = "arn:aws:iam::756921148444:role/OrganizationAccountAccessRole"
    }
  }
}
