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