#!/bin/bash

echo "🚀 Creating Geo-Sentinel Terraform structure..."

BASE_DIR="infra/terraform"

# Root structure
mkdir -p $BASE_DIR
cd $BASE_DIR || exit

touch main.tf variables.tf outputs.tf provider.tf terraform.tfvars

# Backend folder
mkdir -p backend
touch backend/user_data.sh

# IAM folder (NEW 🔥)
mkdir -p iam
touch iam/github_oidc.tf
touch iam/github_deploy_role.tf
touch iam/github_deploy_policy.tf

# Modules structure
mkdir -p modules/ec2 modules/s3

# EC2 module files
touch modules/ec2/main.tf
touch modules/ec2/variables.tf
touch modules/ec2/outputs.tf

# S3 module files
touch modules/s3/main.tf
touch modules/s3/variables.tf
touch modules/s3/outputs.tf

echo "✅ Terraform structure created successfully!"

echo ""
echo "📂 Structure:"
tree || echo "(Install 'tree' to visualize structure)"