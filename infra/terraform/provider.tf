terraform {
  required_version = ">= 1.3.0, < 2.0.0"

  cloud {
    organization = "sujay-devops-lab"

    workspaces {
      name = "geo-sentinel-web-dev"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}