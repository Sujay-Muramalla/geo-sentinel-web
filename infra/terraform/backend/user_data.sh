#!/usr/bin/env bash
set -euxo pipefail

exec > >(tee /var/log/geo-sentinel-user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

BACKEND_CLONE_PATH="${backend_clone_path}"
BACKEND_PORT="${backend_port}"
PYTHON_WORKER_TIMEOUT_MS="${python_worker_timeout_ms}"
FRONTEND_ORIGIN="${frontend_origin}"
GITHUB_REPOSITORY_URL="${github_repository_url}"
BACKEND_GIT_REF="${backend_git_ref}"

SERVICE_NAME="geo-sentinel-backend"
BACKEND_DIR="$${BACKEND_CLONE_PATH}/backend"
ENV_FILE="$${BACKEND_DIR}/.env"
SYSTEMD_UNIT="/etc/systemd/system/$${SERVICE_NAME}.service"
DEPLOY_HELPER="/usr/local/bin/deploy-backend"
DEPLOY_STATE_DIR="/opt/geo-sentinel-deploy"
DEPLOY_STATE_FILE="$${DEPLOY_STATE_DIR}/backend-current-ref"
NODE_MAJOR="20"

log_failure() {
  echo "❌ Geo-Sentinel bootstrap failed"
  echo "===== systemctl status ====="
  systemctl status "$${SERVICE_NAME}" --no-pager || true
  echo "===== journalctl ====="
  journalctl -u "$${SERVICE_NAME}" --no-pager -n 200 || true
}

trap log_failure ERR

echo "🚀 Starting Geo-Sentinel backend bootstrap"
echo "Repository URL: $${GITHUB_REPOSITORY_URL}"
echo "Backend git ref: $${BACKEND_GIT_REF}"
echo "Clone path: $${BACKEND_CLONE_PATH}"

dnf update -y
dnf install -y git gcc-c++ make python3 python3-pip python3-virtualenv

if ! command -v curl >/dev/null 2>&1; then
  echo "❌ curl is required but was not found on this AMI"
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || ! node --version | grep -q "^v$${NODE_MAJOR}\."; then
  echo "📦 Installing Node.js $${NODE_MAJOR}.x"
  curl -fsSL "https://rpm.nodesource.com/setup_$${NODE_MAJOR}.x" -o /tmp/nodesource_setup.sh
  bash /tmp/nodesource_setup.sh
  dnf install -y nodejs
else
  echo "✅ Node.js already present: $(node --version)"
fi

mkdir -p "$(dirname "$${BACKEND_CLONE_PATH}")"
mkdir -p "$${DEPLOY_STATE_DIR}"

cat > "$${DEPLOY_HELPER}" <<EOF
#!/usr/bin/env bash
set -euxo pipefail

TARGET_REF="\$${1:-main}"

BACKEND_CLONE_PATH="${backend_clone_path}"
BACKEND_PORT="${backend_port}"
PYTHON_WORKER_TIMEOUT_MS="${python_worker_timeout_ms}"
FRONTEND_ORIGIN="${frontend_origin}"
GITHUB_REPOSITORY_URL="${github_repository_url}"

SERVICE_NAME="geo-sentinel-backend"
BACKEND_DIR="\$${BACKEND_CLONE_PATH}/backend"
ENV_FILE="\$${BACKEND_DIR}/.env"
SYSTEMD_UNIT="/etc/systemd/system/\$${SERVICE_NAME}.service"
DEPLOY_STATE_DIR="/opt/geo-sentinel-deploy"
DEPLOY_STATE_FILE="\$${DEPLOY_STATE_DIR}/backend-current-ref"

echo "🚀 Running deploy helper"
echo "Repository URL: \$${GITHUB_REPOSITORY_URL}"
echo "Target ref: \$${TARGET_REF}"
echo "Clone path: \$${BACKEND_CLONE_PATH}"

mkdir -p "\$(dirname "\$${BACKEND_CLONE_PATH}")"
mkdir -p "\$${DEPLOY_STATE_DIR}"

if ! command -v curl >/dev/null 2>&1; then
  echo "❌ curl is required but was not found on this AMI"
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || ! node --version | grep -q "^v20\."; then
  echo "📦 Installing Node.js 20.x"
  curl -fsSL "https://rpm.nodesource.com/setup_20.x" -o /tmp/nodesource_setup.sh
  bash /tmp/nodesource_setup.sh
  dnf install -y nodejs
fi

if [ -d "\$${BACKEND_CLONE_PATH}/.git" ]; then
  echo "🔄 Existing repository found. Refreshing checkout..."
  git -C "\$${BACKEND_CLONE_PATH}" fetch --all --prune

  if git -C "\$${BACKEND_CLONE_PATH}" rev-parse --verify "origin/\$${TARGET_REF}" >/dev/null 2>&1; then
    git -C "\$${BACKEND_CLONE_PATH}" checkout -B "\$${TARGET_REF}" "origin/\$${TARGET_REF}"
    git -C "\$${BACKEND_CLONE_PATH}" reset --hard "origin/\$${TARGET_REF}"
  else
    echo "❌ Remote ref origin/\$${TARGET_REF} not found"
    exit 1
  fi

  git -C "\$${BACKEND_CLONE_PATH}" clean -fd
else
  echo "📥 Cloning repository..."
  rm -rf "\$${BACKEND_CLONE_PATH}"
  git clone --depth 1 --branch "\$${TARGET_REF}" "\$${GITHUB_REPOSITORY_URL}" "\$${BACKEND_CLONE_PATH}"
fi

cd "\$${BACKEND_DIR}"

echo "📦 Installing Node dependencies"
npm ci --omit=dev

if [ ! -d ".venv" ]; then
  echo "🐍 Creating Python virtual environment"
  python3 -m venv .venv
fi

echo "🐍 Installing Python dependencies"
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r src/python/requirements.txt
deactivate

echo "📝 Writing environment file"
cat > "\$${ENV_FILE}" <<EOT
NODE_ENV=production
PORT=\$${BACKEND_PORT}
CORS_ALLOWED_ORIGINS=\$${FRONTEND_ORIGIN}
PYTHON_COMMAND=\$${BACKEND_DIR}/.venv/bin/python
PYTHON_INTELLIGENCE_WORKER=\$${BACKEND_DIR}/src/python/rss_intelligence_worker.py
PYTHON_WORKER_TIMEOUT_MS=\$${PYTHON_WORKER_TIMEOUT_MS}
EOT

echo "🛠️ Writing systemd service"
cat > "\$${SYSTEMD_UNIT}" <<EOT
[Unit]
Description=Geo-Sentinel Backend API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ec2-user
Group=ec2-user
WorkingDirectory=\$${BACKEND_DIR}
EnvironmentFile=\$${ENV_FILE}
Environment=HOME=/home/ec2-user
ExecStart=/usr/bin/node \$${BACKEND_DIR}/src/server.js
Restart=always
RestartSec=5
StartLimitBurst=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=\$${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOT

chown -R ec2-user:ec2-user "\$${BACKEND_CLONE_PATH}"
echo "\$${TARGET_REF}" > "\$${DEPLOY_STATE_FILE}"
chown ec2-user:ec2-user "\$${DEPLOY_STATE_FILE}"

systemctl daemon-reload
systemctl enable "\$${SERVICE_NAME}"
systemctl restart "\$${SERVICE_NAME}"

echo "⏳ Waiting for service to become active"
for attempt in \$(seq 1 12); do
  if systemctl is-active --quiet "\$${SERVICE_NAME}"; then
    echo "✅ \$${SERVICE_NAME} is active on attempt \$${attempt}"
    break
  fi
  sleep 5
done

if ! systemctl is-active --quiet "\$${SERVICE_NAME}"; then
  echo "❌ \$${SERVICE_NAME} failed to become active"
  systemctl status "\$${SERVICE_NAME}" --no-pager || true
  journalctl -u "\$${SERVICE_NAME}" --no-pager -n 200 || true
  exit 1
fi

echo "🩺 Waiting for backend health endpoint"
for attempt in \$(seq 1 24); do
  if curl -fsS "http://127.0.0.1:\$${BACKEND_PORT}/api/health" >/dev/null; then
    echo "✅ Geo-Sentinel backend became healthy on attempt \$${attempt}"
    exit 0
  fi
  sleep 5
done

echo "❌ Geo-Sentinel backend failed health check after deploy"
systemctl status "\$${SERVICE_NAME}" --no-pager || true
journalctl -u "\$${SERVICE_NAME}" --no-pager -n 200 || true
exit 1
EOF

chmod +x "$${DEPLOY_HELPER}"

echo "🚀 Performing initial backend deploy from bootstrap"
"$${DEPLOY_HELPER}" "$${BACKEND_GIT_REF}"

echo "✅ Geo-Sentinel backend bootstrap completed successfully"