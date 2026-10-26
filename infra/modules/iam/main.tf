data "aws_iam_policy_document" "terraform_plan_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = [var.management_terraform_plan_role_arn]
    }
  }
}

resource "aws_iam_role" "terraform_plan" {
  name               = var.terraform_plan_role_name
  assume_role_policy = data.aws_iam_policy_document.terraform_plan_assume_role.json
}

resource "aws_iam_role_policy_attachment" "terraform_plan_read_only" {
  role       = aws_iam_role.terraform_plan.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# fnox exec reads through BatchGetSecretValue, which cannot be scoped to secret ARNs.
data "aws_iam_policy_document" "terraform_plan_secrets_read" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = var.secret_arns
  }

  statement {
    actions   = ["secretsmanager:BatchGetSecretValue"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "terraform_plan_secrets_read" {
  name   = "ura-karibari-secrets-read"
  role   = aws_iam_role.terraform_plan.id
  policy = data.aws_iam_policy_document.terraform_plan_secrets_read.json
}
