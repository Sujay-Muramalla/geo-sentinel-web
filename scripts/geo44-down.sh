#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR/infra/terraform"

terraform apply \
  -var="enable_backend_ec2=false" \
  "$@"

echo
echo "Backend compute disabled."
echo "Foundation resources remain."

echo
echo "Remaining frontend URL:"
terraform output -raw frontend_website_url || true