@echo off
cd /d "%~dp0"
echo Faith Mindmap local server
echo   PC: http://localhost:8770/
echo   Phone (Wi-Fi): http://YOUR_PC_IP:8770/
echo   Phone (외출): Tailscale IP — setup-tailscale.bat
echo   HTTPS Tunnel: start-cloudflare-tunnel.bat (선택)
echo   Guide: REMOTE-ACCESS.md
echo.
python api.py
