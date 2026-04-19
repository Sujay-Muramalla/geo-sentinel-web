variable "aws_region" {
  type        = string
  description = "AWS region for Geo-Sentinel infrastructure"
  default     = "eu-central-1"
}

variable "project_name" {
  type        = string
  description = "Project name used for tagging and naming resources"
  default     = "geo-sentinel"
}

variable "environment" {
  type        = string
  description = "Deployment environment name"
  default     = "dev"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the Geo-Sentinel VPC"
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets"
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets"
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones used by the subnets"
  default     = ["eu-central-1a", "eu-central-1b"]
}

variable "frontend_bucket_name" {
  type        = string
  description = "S3 bucket name for Geo-Sentinel frontend static hosting"
  default     = "geo-sentinel-web-frontend-632150488936"
}