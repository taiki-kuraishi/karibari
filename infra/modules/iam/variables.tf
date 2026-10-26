variable "terraform_plan_role_name" {
  description = "Name of the read-only role that CI uses for terraform plan"
  type        = string
}

variable "management_terraform_plan_role_arn" {
  description = "CI plan role in the management account, the only principal trusted by the plan role"
  type        = string
}

variable "secret_arns" {
  description = "ARNs of the Secrets Manager secrets that the plan role reads"
  type        = list(string)
}
