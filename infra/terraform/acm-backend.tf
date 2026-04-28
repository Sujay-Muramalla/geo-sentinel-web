resource "aws_acm_certificate" "backend_api_cert" {
  count = var.enable_backend_alb && var.enable_backend_https ? 1 : 0

  domain_name       = var.backend_api_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-backend-api-cert"
    Role = "backend-api-https"
  })
}

resource "aws_acm_certificate_validation" "backend_api_cert_validation" {
  count = var.enable_backend_alb && var.enable_backend_https ? 1 : 0

  certificate_arn = aws_acm_certificate.backend_api_cert[0].arn

  validation_record_fqdns = [
    for dvo in aws_acm_certificate.backend_api_cert[0].domain_validation_options :
    dvo.resource_record_name
  ]
}

output "backend_api_acm_validation_records" {
  description = "DNS validation records for the backend API ACM certificate"
  value       = try(aws_acm_certificate.backend_api_cert[0].domain_validation_options, null)
}
