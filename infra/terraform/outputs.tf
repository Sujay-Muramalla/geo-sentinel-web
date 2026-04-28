output "vpc_id" {
  description = "ID of the Geo-Sentinel VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = [for subnet in aws_subnet.public : subnet.id]
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = [for subnet in aws_subnet.private : subnet.id]
}

output "public_route_table_id" {
  description = "ID of the public route table"
  value       = aws_route_table.public.id
}

output "private_route_table_id" {
  description = "ID of the private route table"
  value       = aws_route_table.private.id
}

output "frontend_bucket_name" {
  description = "Name of the frontend S3 bucket"
  value       = aws_s3_bucket.frontend_bucket.id
}

output "frontend_bucket_arn" {
  description = "ARN of the frontend S3 bucket"
  value       = aws_s3_bucket.frontend_bucket.arn
}

output "frontend_website_endpoint" {
  description = "S3 static website endpoint for the frontend bucket"
  value       = aws_s3_bucket_website_configuration.frontend_bucket_website.website_endpoint
}

output "frontend_website_domain" {
  description = "S3 static website domain for the frontend bucket"
  value       = aws_s3_bucket_website_configuration.frontend_bucket_website.website_domain
}

output "frontend_website_url" {
  description = "Public HTTP URL of the frontend static website"
  value       = "http://${aws_s3_bucket_website_configuration.frontend_bucket_website.website_endpoint}"
}

output "backend_instance_id" {
  description = "ID of the backend EC2 instance"
  value       = try(aws_instance.backend[0].id, null)
}

output "backend_public_ip" {
  description = "Public IP of the backend EC2 instance"
  value       = try(aws_instance.backend[0].public_ip, null)
}

output "backend_public_dns" {
  description = "Public DNS of the backend EC2 instance"
  value       = try(aws_instance.backend[0].public_dns, null)
}

output "backend_health_url" {
  description = "Direct EC2 health endpoint for the backend API"
  value       = try(format("http://%s:%d/api/health", aws_instance.backend[0].public_ip, var.backend_port), null)
}

output "backend_api_generate_url" {
  description = "Direct EC2 generate endpoint for the backend intelligence API"
  value       = try(format("http://%s:%d/api/intelligence/generate", aws_instance.backend[0].public_ip, var.backend_port), null)
}

output "backend_alb_dns_name" {
  description = "DNS name of the backend Application Load Balancer"
  value       = try(aws_lb.backend_api[0].dns_name, null)
}

output "backend_alb_zone_id" {
  description = "Canonical hosted zone ID of the backend Application Load Balancer"
  value       = try(aws_lb.backend_api[0].zone_id, null)
}

output "backend_alb_http_url" {
  description = "HTTP URL for the backend ALB"
  value       = try("http://${aws_lb.backend_api[0].dns_name}", null)
}

output "backend_alb_https_url" {
  description = "HTTPS URL for the backend API custom domain"
  value       = var.enable_backend_alb && var.enable_backend_https ? "https://${var.backend_api_domain}" : null
}

output "backend_api_domain" {
  description = "Custom backend API domain"
  value       = var.backend_api_domain
}

output "backend_target_group_arn" {
  description = "ARN of the backend ALB target group"
  value       = try(aws_lb_target_group.backend_api[0].arn, null)
}

output "dynamodb_cache_table_name" {
  description = "Name of the DynamoDB cache metadata table"
  value       = aws_dynamodb_table.geo_sentinel_cache.name
}

output "dynamodb_cache_table_arn" {
  description = "ARN of the DynamoDB cache metadata table"
  value       = aws_dynamodb_table.geo_sentinel_cache.arn
}

output "reports_bucket_name" {
  description = "Name of the private S3 reports and snapshots bucket"
  value       = aws_s3_bucket.reports_bucket.id
}

output "reports_bucket_arn" {
  description = "ARN of the private S3 reports and snapshots bucket"
  value       = aws_s3_bucket.reports_bucket.arn
}

output "reports_snapshot_prefix" {
  description = "Default S3 prefix used for intelligence result snapshots"
  value       = "snapshots/"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend_cdn.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend_cdn.domain_name
}

output "cloudfront_url" {
  description = "Public HTTPS URL via CloudFront"
  value       = "https://${aws_cloudfront_distribution.frontend_cdn.domain_name}"
}

output "cognito_user_pool_id" {
  description = "ID of the Geo-Sentinel Cognito User Pool"
  value       = aws_cognito_user_pool.geo_sentinel_auth.id
}

output "cognito_user_pool_arn" {
  description = "ARN of the Geo-Sentinel Cognito User Pool"
  value       = aws_cognito_user_pool.geo_sentinel_auth.arn
}

output "cognito_user_pool_endpoint" {
  description = "Endpoint of the Geo-Sentinel Cognito User Pool"
  value       = aws_cognito_user_pool.geo_sentinel_auth.endpoint
}

output "cognito_web_app_client_id" {
  description = "Client ID of the Geo-Sentinel Cognito web app client"
  value       = aws_cognito_user_pool_client.geo_sentinel_web_app.id
}

output "cognito_domain_prefix" {
  description = "Cognito hosted UI domain prefix"
  value       = aws_cognito_user_pool_domain.geo_sentinel_auth_domain.domain
}

output "cognito_hosted_ui_base_url" {
  description = "Base URL for the Cognito hosted UI domain"
  value       = "https://${aws_cognito_user_pool_domain.geo_sentinel_auth_domain.domain}.auth.${var.aws_region}.amazoncognito.com"
}
