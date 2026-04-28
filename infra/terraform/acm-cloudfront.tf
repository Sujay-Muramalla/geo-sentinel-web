provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

resource "aws_acm_certificate" "cloudfront_cert" {
  provider          = aws.us_east_1
  domain_name       = var.custom_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# 🔥 THIS WAS MISSING
resource "aws_acm_certificate_validation" "cloudfront_cert_validation" {
  provider = aws.us_east_1

  certificate_arn = aws_acm_certificate.cloudfront_cert.arn

  validation_record_fqdns = [
    aws_acm_certificate.cloudfront_cert.domain_validation_options[0].resource_record_name
  ]
}

output "acm_validation_records" {
  value = aws_acm_certificate.cloudfront_cert.domain_validation_options
}