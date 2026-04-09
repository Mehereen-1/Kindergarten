@echo off
setlocal

cd /d C:\system project\Kindergarten\next-dashboard-ui\attendance_cctv

set CLOUDFLARED_BIN=C:\system project\Kindergarten\next-dashboard-ui\attendance_cctv\tools\cloudflared.exe

if not exist "%CLOUDFLARED_BIN%" (
  echo cloudflared.exe not found at:
  echo %CLOUDFLARED_BIN%
  exit /b 1
)

echo Starting temporary public HTTPS tunnel for http://localhost:8000
echo Keep this window open while remote users need attendance access.
echo.

"%CLOUDFLARED_BIN%" tunnel --url http://localhost:8000
