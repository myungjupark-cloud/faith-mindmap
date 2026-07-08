@echo off
cd /d "%~dp0"
echo ========================================
echo  Faith Mindmap — Tailscale 외출 접속
echo ========================================
echo.
where tailscale >nul 2>&1
if errorlevel 1 (
  echo [미설치] Tailscale을 설치하세요.
  echo   https://tailscale.com/download/windows
  echo.
  start https://tailscale.com/download/windows
) else (
  echo [설치됨] Tailscale 상태:
  tailscale status
  echo.
  echo 이 PC Tailscale IPv4:
  tailscale ip -4
  if errorlevel 1 echo   ^(연결 안 됨 — Tailscale 앱에서 로그인^)
)
echo.
echo --- 사용 방법 ---
echo 1. 집 PC와 폰 모두 같은 Tailscale 계정으로 로그인
echo 2. serve.bat 실행
echo 3. 폰 브라우저: http://위_IP:8770/
echo 4. 운영 버튼 -^> PIN 입력 후 편집·저장·AI
echo.
echo 자세히: REMOTE-ACCESS.md
echo.
pause
