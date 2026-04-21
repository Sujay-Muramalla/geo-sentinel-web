#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"

if [[ -z "${REPO_ROOT}" ]]; then
  echo "ERROR: Not inside a git repository."
  exit 1
fi

cd "$REPO_ROOT"

OUTPUT_DIR="${REPO_ROOT}/tmp"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_FILE="${OUTPUT_DIR}/geo-context-dump-${TIMESTAMP}.txt"

print_header() {
  local title="$1"
  {
    echo
    echo "=================================================="
    echo "${title}"
    echo "=================================================="
  } >> "$OUTPUT_FILE"
}

print_file() {
  local file_path="$1"

  print_header "FILE: ${file_path}"

  if [[ -f "$file_path" ]]; then
    sed -n '1,400p' "$file_path" >> "$OUTPUT_FILE"
  else
    echo "MISSING: ${file_path}" >> "$OUTPUT_FILE"
  fi
}

print_tree() {
  local target_dir="$1"
  local depth="$2"

  print_header "TREE: ${target_dir} (depth ${depth})"

  if [[ -d "$target_dir" ]]; then
    if command -v tree >/dev/null 2>&1; then
      tree -L "$depth" "$target_dir" >> "$OUTPUT_FILE"
    else
      echo "NOTE: 'tree' command not found. Falling back to find." >> "$OUTPUT_FILE"
      find "$target_dir" -maxdepth "$depth" | sort >> "$OUTPUT_FILE"
    fi
  else
    echo "MISSING DIRECTORY: ${target_dir}" >> "$OUTPUT_FILE"
  fi
}

{
  echo "Geo-Sentinel Context Dump"
  echo "Generated: $(date -Iseconds)"
  echo "Repo root: ${REPO_ROOT}"
} > "$OUTPUT_FILE"

print_header "GIT OVERVIEW"
{
  echo "\$ git branch --show-current"
  git branch --show-current
  echo
  echo "\$ git status"
  git status
  echo
  echo "\$ git remote -v"
  git remote -v
} >> "$OUTPUT_FILE"

print_tree "${REPO_ROOT}/backend" 3

print_file "${REPO_ROOT}/backend/src/app.js"
print_file "${REPO_ROOT}/backend/src/server.js"
print_file "${REPO_ROOT}/backend/src/controllers/intelligenceController.js"
print_file "${REPO_ROOT}/backend/src/services/intelligenceService.js"
print_file "${REPO_ROOT}/backend/src/routes/intelligenceRoutes.js"
print_file "${REPO_ROOT}/backend/package.json"
print_file "${REPO_ROOT}/backend/.env.example"

print_file "${REPO_ROOT}/index.html"
print_file "${REPO_ROOT}/js/main.js"
print_file "${REPO_ROOT}/js/config.js"

print_tree "${REPO_ROOT}/infra/terraform" 3
print_file "${REPO_ROOT}/infra/terraform/backend/user_data.sh"

print_header "DONE"
echo "Context dump written to: ${OUTPUT_FILE}" >> "$OUTPUT_FILE"

echo
echo "Context dump created:"
echo "$OUTPUT_FILE"