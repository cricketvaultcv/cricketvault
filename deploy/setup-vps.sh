#!/usr/bin/env bash
set -Eeuo pipefail

# Run once on a fresh Ubuntu VPS as root (or through sudo):
#   sudo bash deploy/setup-vps.sh <yourdomain.in> <deploy-user>
# DNS A records for the domain and www must point at this VPS before Certbot runs.

DOMAIN="${1:?Usage: setup-vps.sh <yourdomain.in> <deploy-user>}"
APP_USER="${2:?Usage: setup-vps.sh <yourdomain.in> <deploy-user>}"
APP_DIR="/var/www/cricketvault"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root, for example: sudo bash deploy/setup-vps.sh ${DOMAIN} ${APP_USER}" >&2
  exit 1
fi
if ! id "${APP_USER}" >/dev/null 2>&1; then
  echo "Deploy user '${APP_USER}' does not exist. Create it before rerunning this script." >&2
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl gnupg git nginx certbot python3-certbot-nginx ufw

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
  > /etc/apt/sources.list.d/nodesource.list
apt-get update
apt-get install -y nodejs
npm install --global pm2

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

install -d -o "${APP_USER}" -g "${APP_USER}" -m 0755 "${APP_DIR}"
install -d -o "${APP_USER}" -g "${APP_USER}" -m 0755 /var/log/cricketvault

# The repository must be cloned by APP_USER into APP_DIR before starting PM2.
echo "Base VPS setup complete. Clone the repository into ${APP_DIR} as ${APP_USER}, configure server/.env, then install the Nginx configuration."
