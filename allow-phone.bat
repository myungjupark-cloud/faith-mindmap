@echo off
cd /d "%~dp0"
echo Windows 방화벽에 TCP 8770 허용 규칙을 추가합니다.
echo (관리자 권한 필요 — 거부되면 우클릭 ^> 관리자 권한으로 실행)
echo.
netsh advfirewall firewall add rule name="Faith Mindmap 8770" dir=in action=allow protocol=TCP localport=8770
if errorlevel 1 (
  echo 실패 — 관리자 권한으로 다시 실행하세요.
) else (
  echo 완료 — serve.bat 실행 후 폰에서 http://PC_IP:8770/ 접속
)
pause
