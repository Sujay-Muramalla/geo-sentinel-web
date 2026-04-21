#!/usr/bin/env bash
set -euxo pipefail

exec > >(tee /var/log/geo-sentinel-user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

BACKEND_CLONE_PATH="${backend_clone_path}"
BACKEND_PORT="${backend_port}"
PYTHON_WORKER_TIMEOUT_MS="${python_worker_timeout_ms}"
FRONTEND_ORIGIN="${frontend_origin}"
GITHUB_REPOSITORY_URL="${github_repository_url}"
BACKEND_GIT_REF="${backend_git_ref}"

dnf update -y
dnf install -y git gcc-c++ make python3 python3-pip curl

curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

rm -rf "$BACKEND_CLONE_PATH"
mkdir -p "$(dirname "$BACKEND_CLONE_PATH")"
git clone --depth 1 --branch "$BACKEND_GIT_REF" "$GITHUB_REPOSITORY_URL" "$BACKEND_CLONE_PATH"

cd "$BACKEND_CLONE_PATH/backend"

npm ci --omit=dev

python3 -m pip install --upgrade pip
python3 -m pip install -r src/python/requirements.txt

cat > .env <<EOF
NODE_ENV=production
PORT=$BACKEND_PORT
CORS_ALLOWED_ORIGINS=$FRONTEND_ORIGIN
PYTHON_COMMAND=python3
PYTHON_INTELLIGENCE_WORKER=$BACKEND_CLONE_PATH/backend/src/python/rss_intelligence_worker.py
PYTHON_WORKER_TIMEOUT_MS=$PYTHON_WORKER_TIMEOUT_MS
EOF

cat > /etc/systemd/system/geo-sentinel-backend.service <<EOF
[Unit]
Description=Geo-Sentinel Backend API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=$BACKEND_CLONE_PATH/backend
EnvironmentFile=$BACKEND_CLONE_PATH/backend/.env
ExecStart=/usr/bin/node $BACKEND_CLONE_PATH/backend/src/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

chown -R ec2-user:ec2-user "$BACKEND_CLONE_PATH"

systemctl daemon-reload
systemctl enable geo-sentinel-backend
systemctl restart geo-sentinel-backend

for attempt in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null; then
    echo "Geo-Sentinel backend became healthy on attempt $attempt"
    exit 0
  fi
  sleep 5
done

echo "Geo-Sentinel backend failed health check after bootstrap" >&2
systemctl status geo-sentinel-backend --no-pager || true
journalctl -u geo-sentinel-backend --no-pager -n 200 || true
exit 1