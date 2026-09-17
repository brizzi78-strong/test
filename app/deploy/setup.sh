#!/usr/bin/env bash
#
# Cardinal — one-command setup for your own server (no SaaS, no vendor lock-in).
#
# What it does, on a fresh Ubuntu/Debian server you control:
#   1. Installs Node.js 22 (needed for the built-in SQLite database)
#   2. Installs the app to /opt/cardinal and runs it as a locked-down service
#   3. Installs Caddy, which gets a free HTTPS certificate for your domain
#      automatically and forwards traffic to the app
#
# After it finishes, https://YOURDOMAIN is live and installable on a phone.
#
# Usage (from inside this app/ folder, as root):
#   sudo bash deploy/setup.sh yourdomain.com
#
# Requirements: a server running Ubuntu 22.04+/Debian 12+, and a domain whose
# DNS A record already points at this server's public IP.

set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "Usage: sudo bash deploy/setup.sh yourdomain.com" >&2
  exit 1
fi
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run with sudo:  sudo bash deploy/setup.sh $DOMAIN" >&2
  exit 1
fi

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # the app/ folder
APP_DIR="/opt/cardinal"
DATA_DIR="$APP_DIR/data"

echo "==> Cardinal setup for https://$DOMAIN"

# --- 1. Node.js 22 -----------------------------------------------------------
need_node=1
if command -v node >/dev/null 2>&1; then
  major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  [[ "$major" -ge 22 ]] && need_node=0
fi
if [[ "$need_node" -eq 1 ]]; then
  echo "==> Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
else
  echo "==> Node.js $(node -v) already present."
fi

# --- 2. App + service account ------------------------------------------------
echo "==> Installing app to $APP_DIR ..."
id cardinal >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin cardinal
mkdir -p "$APP_DIR" "$DATA_DIR"
cp -r "$SRC_DIR/server.mjs" "$SRC_DIR/admin.mjs" "$SRC_DIR/public" "$APP_DIR/"
chown -R cardinal:cardinal "$APP_DIR"

echo "==> Installing systemd service ..."
sed "s#__APP_DIR__#$APP_DIR#g; s#__DATA_DIR__#$DATA_DIR#g" \
  "$SRC_DIR/deploy/cardinal.service" > /etc/systemd/system/cardinal.service
systemctl daemon-reload
systemctl enable --now cardinal
systemctl restart cardinal

# --- 3. Caddy (automatic HTTPS) ---------------------------------------------
if ! command -v caddy >/dev/null 2>&1; then
  echo "==> Installing Caddy (automatic HTTPS)..."
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update
  apt-get install -y caddy
fi

echo "==> Configuring Caddy for $DOMAIN ..."
sed "s#__DOMAIN__#$DOMAIN#g" "$SRC_DIR/deploy/Caddyfile" > /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy

echo ""
echo "==> Done."
echo "    Cardinal is live at:  https://$DOMAIN"
echo "    (Caddy fetches the HTTPS certificate on first request — give it a few seconds.)"
echo ""
echo "    Approve a member after their background check:"
echo "      sudo -u cardinal CARDINAL_DB=$DATA_DIR/cardinal.db node $APP_DIR/admin.mjs list"
echo "      sudo -u cardinal CARDINAL_DB=$DATA_DIR/cardinal.db node $APP_DIR/admin.mjs verify someone@email.com"
echo ""
echo "    Logs:     journalctl -u cardinal -f"
echo "    Restart:  systemctl restart cardinal"
