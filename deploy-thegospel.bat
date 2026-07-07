@echo off
setlocal
set SRC=%~dp0
set DST=C:\Projects\thegospel-kr\faith-mindmap
if not exist "%DST%" mkdir "%DST%"
if not exist "%DST%\data" mkdir "%DST%\data"
copy /Y "%SRC%index.html" "%DST%\"
copy /Y "%SRC%app.js" "%DST%\"
copy /Y "%SRC%app.css" "%DST%\"
copy /Y "%SRC%sw.js" "%DST%\"
copy /Y "%SRC%manifest.json" "%DST%\"
copy /Y "%SRC%icon.svg" "%DST%\"
copy /Y "%SRC%markdown.js" "%DST%\"
copy /Y "%SRC%data\mindmap.json" "%DST%\data\"
copy /Y "%SRC%.htaccess" "%DST%\"
echo.
echo Copied to %DST%
echo Upload thegospel-kr/faith-mindmap/ to server, then open:
echo   https://thegospel.kr/faith-mindmap/
pause
