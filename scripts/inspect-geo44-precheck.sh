#!/usr/bin/env bash

set -euo pipefail

echo "============================================================"
echo "GEO-44 PRECHECK / REPO INSPECTION"
echo "============================================================"
echo

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

print_section() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

print_file() {
  local file_path="$1"
  if [[ -f "$file_path" ]]; then
    echo "--- FILE: $file_path ---"
    sed -n '1,260p' "$file_path"
  else
    echo "--- MISSING FILE: $file_path ---"
  fi
}

print_find_files() {
  local dir_path="$1"
  local maxdepth="${2:-3}"
  if [[ -d "$dir_path" ]]; then
    echo "--- FILE LIST: $dir_path (maxdepth=$maxdepth) ---"
    find "$dir_path" -maxdepth "$maxdepth" -type f | sort
  else
    echo "--- MISSING DIRECTORY: $dir_path ---"
  fi
}

print_grep_matches() {
  local pattern="$1"
  shift
  echo "--- SEARCH: $pattern ---"
  grep -RInE "$pattern" "$@" 2>/dev/null || true
}

print_section "1) GIT / WORKING TREE STATUS"
git branch --show-current
echo
git status

print_section "2) TOP-LEVEL REPO STRUCTURE"
find . \
  -path "./.git" -prune -o \
  -path "./node_modules" -prune -o \
  -path "./backend/node_modules" -prune -o \
  -maxdepth 3 -print | sort

print_section "3) BACKEND ENTRY FILES"
print_file "backend/src/server.js"
echo
print_file "backend/src/app.js"

print_section "4) BACKEND SERVICE FILES"
print_find_files "backend/src/services" 3

print_section "5) BACKEND PYTHON FILES"
print_find_files "backend/src/python" 4

print_section "6) BACKEND CONFIG / ROUTES / CONTROLLERS"
print_find_files "backend/src/config" 3
echo
print_find_files "backend/src/routes" 3
echo
print_find_files "backend/src/controllers" 3

print_section "7) BACKEND PACKAGE FILES"
print_file "backend/package.json"
echo
print_file "backend/package-lock.json"

print_section "8) TERRAFORM CORE FILES"
print_file "infra/terraform/provider.tf"
echo
print_file "infra/terraform/main.tf"
echo
print_file "infra/terraform/variables.tf"
echo
print_file "infra/terraform/outputs.tf"
echo
print_file "infra/terraform/s3-frontend-bucket.tf"
echo
print_file "infra/terraform/github_oidc.tf"
echo
print_file "infra/terraform/github_deploy_role.tf"

print_section "9) TERRAFORM MODULE / BACKEND STRUCTURE"
if [[ -d "infra/terraform/modules" ]]; then
  find "infra/terraform/modules" -maxdepth 4 -print | sort
else
  echo "--- MISSING DIRECTORY: infra/terraform/modules ---"
fi

echo
if [[ -d "infra/terraform/backend" ]]; then
  find "infra/terraform/backend" -maxdepth 4 -print | sort
else
  echo "--- MISSING DIRECTORY: infra/terraform/backend ---"
fi

print_section "10) SEARCH FOR PORT / CORS / API / PYTHON / ENV"
print_grep_matches "cors|CORS|PORT|API|PYTHON|origin|process\\.env|spawn|python" \
  "backend/src" "backend/package.json" "js/main.js"

print_section "11) SEARCH FOR EC2 / SG / VPC / SUBNET / IAM IN TERRAFORM"
print_grep_matches "aws_instance|security_group|aws_security_group|subnet|vpc|iam_instance_profile|key_name|user_data|aws_internet_gateway|route_table" \
  "infra/terraform"

print_section "12) FRONTEND API WIRING FILE"
print_file "js/main.js"

print_section "13) OPTIONAL ENV / EXAMPLE FILES"
find . \
  -path "./.git" -prune -o \
  -type f \( -name ".env" -o -name ".env.*" -o -name "*.example" -o -name "*.sample" \) \
  -print | sort

print_section "14) TERRAFORM FORMAT / VALIDATION SNAPSHOT"
if command -v terraform >/dev/null 2>&1; then
  (
    cd infra/terraform
    echo "--- terraform version ---"
    terraform version || true
    echo
    echo "--- terraform fmt -check ---"
    terraform fmt -check || true
    echo
    echo "--- terraform validate ---"
    terraform validate || true
  )
else
  echo "terraform command not found in PATH"
fi

print_section "15) DONE"
echo "GEO-44 precheck inspection completed."