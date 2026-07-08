@echo off
setlocal
cd /d "%~dp0"
set TS="C:\Program Files\Tailscale\tailscale.exe"
set HOSTNAME=faith-mindmap-home

echo ========================================
echo  Tailscale 로그인 후 고정 주소 설정
echo ========================================
echo.

%TS% status 2>nul | findstr /i "Logged out NeedsLogin" >nul
if not errorlevel 1 (
  echo 아직 로그인 안 됨. 브라우저에서 Tailscale 로그인을 완료한 뒤 다시 실행하세요.
  %TS% status 2>nul
  pause
  exit /b 1
)

echo 호스트명 고정: %HOSTNAME%
%TS% set --hostname=%HOSTNAME%
if errorlevel 1 (
  echo 호스트명 설정 실패 — 관리자 권한으로 다시 시도하세요.
  pause
  exit /b 1
)

echo --- 고정 접속 주소 (이 PC) ---
%TS% ip -4
for /f "delims=" %%i in ('%TS% ip -4 2^>nul') do set TSIP=%%i
echo   호스트명: %HOSTNAME%
if defined TSIP echo   http://%TSIP%:8770/
echo   http://%HOSTNAME%:8770/  ^(MagicDNS^)
echo.
echo serve.bat 실행 후 위 주소로 폰에서 접속하세요.
echo 자세히: REMOTE-ACCESS.md
echo.
pause
