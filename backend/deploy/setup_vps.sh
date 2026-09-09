#!/bin/bash
# ==========================================================
# OmniStudio AI — Automated Hostinger VPS Setup Script
# OS: Ubuntu 22.04 / 24.04 LTS
# ==========================================================

set -e

echo "🚀 Starting OmniStudio AI Installation on Hostinger VPS..."

# 1. Update System
sudo apt update && sudo apt upgrade -y

# 2. Install Essentials & FFmpeg
sudo apt install -y curl git build-essential ffmpeg python3 python3-pip python3-venv nginx certbot python3-certbot-nginx

# 3. Verify FFmpeg
ffmpeg -version | head -n 1
echo "✅ FFmpeg installed successfully."

# 4. Install Node.js (v20 LTS) & PM2
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

sudo npm install -g pm2
echo "✅ Node.js $(node -v) & PM2 installed."

# 5. Setup Python Virtual Environment for Backend
cd /var/www/omnistudio/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Python Backend dependencies installed."

# 6. Setup Frontend
cd /var/www/omnistudio/frontend
npm install
npm run build
echo "✅ Frontend Next.js production build ready."

# 7. Start Services via PM2
pm2 delete all || true

cd /var/www/omnistudio/backend
pm2 start "venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000" --name omni-backend

cd /var/www/omnistudio/frontend
pm2 start "npm start -- -p 3000" --name omni-frontend

pm2 save
pm2 startup

echo "=========================================================="
echo "🎉 OmniStudio AI is now LIVE on PM2!"
echo "Backend: http://127.0.0.1:8000"
echo "Frontend: http://127.0.0.1:3000"
echo "Next step: Configure Nginx reverse proxy using deploy/nginx.conf"
echo "=========================================================="
