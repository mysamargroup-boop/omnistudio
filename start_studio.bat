@echo off
TITLE OmniStudio AI — Creative Production Suite
COLOR 0A
echo ==============================================================================
echo                      OMNISTUDIO AI — CREATIVE STUDIO
echo ==============================================================================
echo.
echo [1/2] Starting Python FastAPI Backend on http://localhost:8000 ...
start "OmniStudio Backend (FastAPI)" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Next.js Frontend on http://localhost:3000 ...
start "OmniStudio Frontend (Next.js)" cmd /k "cd /d %~dp0frontend && npm run start -- -p 3000"

timeout /t 2 /nobreak >nul

echo.
echo ==============================================================================
echo  Studio is now LIVE!
echo  Opening browser at http://localhost:3000 ...
echo ==============================================================================
start http://localhost:3000
