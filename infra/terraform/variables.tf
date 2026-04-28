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

variable "enable_backend_ec2" {
  type        = bool
  description = "Whether to create the Geo-Sentinel backend EC2 instance"
  default     = false
}

variable "backend_instance_type" {
  type        = string
  description = "EC2 instance type for the Geo-Sentinel backend"
  default     = "t2.micro"
}

variable "backend_port" {
  type        = number
  description = "Port exposed by the backend API"
  default     = 3000
}

variable "backend_key_name" {
  type        = string
  description = "Optional EC2 key pair name for SSH access"
  default     = ""
}

variable "ssh_allowed_cidrs" {
  type        = list(string)
  description = "CIDR blocks allowed to SSH into the backend instance"
  default     = []
}

variable "github_repository_url" {
  type        = string
  description = "Git repository URL cloned by the backend EC2 bootstrap"
  default     = "https://github.com/Sujay-Muramalla/geo-sentinel-web.git"
}

variable "backend_git_ref" {
  type        = string
  description = "Git branch, tag, or ref to deploy on the backend EC2 instance"
  default     = "main"
}

variable "backend_clone_path" {
  type        = string
  description = "Filesystem path where the repository is cloned on EC2"
  default     = "/opt/geo-sentinel-web"
}

variable "python_worker_timeout_ms" {
  type        = number
  description = "Timeout in milliseconds for the Python intelligence worker"
  default     = 25000
}

variable "custom_domain" {
  description = "Custom domain (subdomain)"
  type        = string
}