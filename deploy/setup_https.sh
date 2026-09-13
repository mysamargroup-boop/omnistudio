#!/usr/bin/env bash
set -e

echo "================================================================"
echo "    OmniStudio AI — Production HTTPS Setup (Free SSL via Caddy) "
echo "================================================================"

# 1. Install Caddy if not present
if ! command -v caddy &> /dev/null; then
    echo "[+] Installing Caddy web server..."
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt-get update
    apt-get install -y caddy
    echo "[?] Caddy installed successfully."
else
    echo "[?] Caddy is already installed."
fi

# 2. Deploy Caddyfile
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/Caddyfile" ]; then
    echo "[+] Applying OmniStudio Caddyfile configuration..."
    cp "$SCRIPT_DIR/Caddyfile" /etc/caddy/Caddyfile
    systemctl reload caddy || systemctl restart caddy
    echo "[?] Caddy configuration loaded."
else
    echo "[!] Error: Caddyfile not found in $SCRIPT_DIR"
    exit 1
fi

echo ""
echo "================================================================"
echo "  [SUCCESS] HTTPS is now LIVE with automatic Let's Encrypt SSL! "
echo "================================================================"
echo "  Studio URL: https://31.97.231.218.sslip.io"
echo "  Backend API: https://31.97.231.218.sslip.io/api/health"
echo "================================================================"
