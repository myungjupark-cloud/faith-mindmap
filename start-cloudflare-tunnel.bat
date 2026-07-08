@echo off
cd /d "%~dp0"
echo ========================================
echo  Faith Mindmap — Cloudflare Tunnel
echo ========================================
echo.
if not exist config.cloudflared.yml (
  echo config.cloudflared.yml 이 없습니다.
  echo   cloudflared.config.example.yml 을 복사·수정하세요.
  echo   REMOTE-ACCESS.md 참고
  echo.
  pause
  exit /b 1
)
where cloudflared >nul 2>&1
if errorlevel 1 (
  echo cloudflared 미설치:
  echo   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
  start https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
  pause
  exit /b 1
)
echo [1] 다른 창에서 serve.bat 이 실행 중이어야 합니다.
echo [2] config.local.json remoteAccess.publicUrl 에 HTTPS 주소를 넣으면
echo     serve.bat 시작 시 URL이 표시됩니다.
echo.
pause
cloudflared tunnel --config config.cloudflared.yml run
