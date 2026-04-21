#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CURRENT_BRANCH="${GEO44_BACKEND_GIT_REF:-$(git -C "$ROOT_DIR" branch --show-current)}"

if [ -z "${CURRENT_BRANCH}" ]; then
  echo "Could not determine current git branch."
  exit 1
fi

if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "This script must be run from inside the geo-sentinel-web repository."
  exit 1
fi

echo "Repo root: $ROOT_DIR"
echo "Deploying backend git ref: $CURRENT_BRANCH"

if ! git -C "$ROOT_DIR" ls-remote --exit-code --heads origin "$CURRENT_BRANCH" >/dev/null 2>&1; then
  echo "Remote branch origin/$CURRENT_BRANCH was not found."
  echo "Push the branch first so EC2 can clone it:"
  echo "  git push -u origin $CURRENT_BRANCH"
  exit 1
fi

cd "$ROOT_DIR/infra/terraform"

terraform apply \
  -var="enable_backend_ec2=true" \
  -var="backend_git_ref=$CURRENT_BRANCH" \
  "$@"

echo
echo "Backend instance ID:"
terraform output -raw backend_instance_id || true

echo
echo "Backend health URL:"
terraform output -raw backend_health_url || true

echo
echo "Backend generate URL:"
terraform output -raw backend_api_generate_url || true