#!/usr/bin/env bash
#
# The Cardinal (social network) — one-command setup for your own server.
# No SaaS, no vendor lock-in: just Node.js and Caddy.
#
# What it does, on a fresh Ubuntu/Debian server you control:
#   1. Installs Node.js 22 (needed for the built-in SQLite database)
#   2. Installs the app to /opt/cardinal-social and runs it as a locked-down service
#   3. Seeds the founder profile so the site isn't empty on first open
#   4. Installs Caddy, which gets a free HTTPS certificate for your domain
#      automatically and forwards traffic to the app
#
# After it finishes, https://YOURDOMAIN is live and installable on a phone.
#
# Usage (from inside this social/ folder, as root):
#   sudo bash deploy/setup.sh yourdomain.com
#
# Requirements: a server running Ubuntu 22.04+/Debian 12+, and a domain whose
# DNS A record already points at this server's public IP.
#
# Runs on port 4000, so it can coexist with the Cardinal dating app (port 3000)
# on the same server.

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

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # the social/ folder
APP_DIR="/opt/cardinal-social"
DATA_DIR="$APP_DIR/data"

echo "==> The Cardinal (social) setup for https://$DOMAIN"

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
id cardinal-social >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin cardinal-social
mkdir -p "$APP_DIR" "$DATA_DIR"
cp -r "$SRC_DIR/server.mjs" "$SRC_DIR/seed.mjs" "$SRC_DIR/public" "$APP_DIR/"
[[ -d "$SRC_DIR/assets" ]] && cp -r "$SRC_DIR/assets" "$APP_DIR/"
chown -R cardinal-social:cardinal-social "$APP_DIR"

echo "==> Installing systemd service ..."
sed "s#__APP_DIR__#$APP_DIR#g; s#__DATA_DIR__#$DATA_DIR#g" \
  "$SRC_DIR/deploy/cardinal-social.service" > /etc/systemd/system/cardinal-social.service
systemctl daemon-reload
systemctl enable --now cardinal-social
systemctl restart cardinal-social

# --- 3. Seed the founder profile (idempotent) --------------------------------
echo "==> Seeding founder profile ..."
sudo -u cardinal-social NEST_DB="$DATA_DIR/cardinal.db" node "$APP_DIR/seed.mjs" || \
  echo "    (seed skipped — already present)"

# --- 4. Caddy (automatic HTTPS) ---------------------------------------------
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
echo "    The Cardinal is live at:  https://$DOMAIN"
echo "    (Caddy fetches the HTTPS certificate on first request — give it a few seconds.)"
echo "    It's installable: open it on a phone and choose 'Add to Home Screen'."
echo ""
echo "    Founder login (from the seed):  rob@thecardinal.com / cardinal1"
echo ""
echo "    Logs:     journalctl -u cardinal-social -f"
echo "    Restart:  systemctl restart cardinal-social"
