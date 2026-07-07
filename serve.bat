@echo off
cd /d "%~dp0"
echo Faith Mindmap local server
echo   PC: http://localhost:8770/
echo   Phone: same Wi-Fi, then http://YOUR_PC_IP:8770/
echo   If phone cannot connect, run allow-phone.bat as Administrator once.
echo.
python api.py
