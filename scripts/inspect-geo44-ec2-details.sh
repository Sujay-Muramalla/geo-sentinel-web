#!/usr/bin/env bash

set -euo pipefail

echo "============================================================"
echo "GEO-44 EC2 MODULE / USER-DATA INSPECTION"
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

print_section "1) EC2 MODULE FILES"
print_file "infra/terraform/modules/ec2/main.tf"
echo
print_file "infra/terraform/modules/ec2/variables.tf"
echo
print_file "infra/terraform/modules/ec2/outputs.tf"

print_section "2) S3 MODULE FILES"
print_file "infra/terraform/modules/s3/main.tf"
echo
print_file "infra/terraform/modules/s3/variables.tf"
echo
print_file "infra/terraform/modules/s3/outputs.tf"

print_section "3) BACKEND USER-DATA SCRIPT"
print_file "infra/terraform/backend/user_data.sh"

print_section "4) INTELLIGENCE SERVICE"
print_file "backend/src/services/intelligenceService.js"

print_section "5) CONTROLLER / ROUTES"
print_file "backend/src/controllers/intelligenceController.js"
echo
print_file "backend/src/routes/intelligenceRoutes.js"

print_section "6) DONE"
echo "GEO-44 EC2 detail inspection completed."