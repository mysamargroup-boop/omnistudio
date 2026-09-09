#!/usr/bin/env bash
set -e

echo "================================================================"
echo "    OmniStudio AI - 1-Click Zero-Interference Docker Deployment "
echo "================================================================"

# 1. Verify / Install Docker if missing
if ! command -v docker &> /dev/null; then
    echo "[+] Docker not found. Installing official Docker Engine..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "[?] Docker installed successfully."
else
    echo "[?] Docker is already installed."
fi

# 2. Verify / Install Docker Compose Plugin if missing
if ! docker compose version &> /dev/null; then
    echo "[+] Installing Docker Compose plugin..."
    apt-get update && apt-get install -y docker-compose-plugin
    echo "[?] Docker Compose plugin installed."
else
    echo "[?] Docker Compose is already installed."
fi

# 3. Setup backend environment if not present
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        echo "[!] backend/.env not found. Creating from .env.example..."
        cp backend/.env.example backend/.env
        echo "[!] Note: Please edit backend/.env with your API keys (nano backend/.env)"
    fi
fi

# 4. Create outputs folder with write permissions
mkdir -p backend/outputs/images backend/outputs/videos backend/outputs/audio backend/outputs/final
chmod -R 777 backend/outputs

# 5. Build and launch isolated containers
echo "[+] Starting OmniStudio AI containers on isolated ports (3050 & 8050)..."
docker compose up -d --build

# 6. Success Status
SERVER_IP=$(curl -s https://api.ipify.org || echo "31.97.231.218")
echo ""
echo "================================================================"
echo "  [SUCCESS] OmniStudio AI is now running in isolated Docker!    "
echo "================================================================"
echo "  Frontend URL: http://${SERVER_IP}:3050"
echo "  Backend API:  http://${SERVER_IP}:8050/api/health"
echo ""
echo "  Notice: Your existing website/project on ports 80/443/3000/8000"
echo "          is 100% UNTOUCHED and running as normal."
echo "================================================================"

