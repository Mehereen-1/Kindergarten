$host.UI.RawUI.WindowTitle = "Attendance Quick Tunnel"
Set-Location "C:\system project\Kindergarten\next-dashboard-ui\attendance_cctv"

$cloudflared = "C:\system project\Kindergarten\next-dashboard-ui\attendance_cctv\tools\cloudflared.exe"
$logFile = "C:\system project\Kindergarten\next-dashboard-ui\attendance_cctv\quick-tunnel.log"
$urlFile = "C:\system project\Kindergarten\next-dashboard-ui\attendance_cctv\quick-tunnel-url.txt"

if (-not (Test-Path $cloudflared)) {
  Write-Host "cloudflared.exe not found:" -ForegroundColor Red
  Write-Host $cloudflared -ForegroundColor Red
  exit 1
}

Remove-Item $logFile -Force -ErrorAction SilentlyContinue
Remove-Item $urlFile -Force -ErrorAction SilentlyContinue

Write-Host "Starting temporary public HTTPS tunnel for http://localhost:8000" -ForegroundColor Cyan
Write-Host "The public URL will be written to:" -ForegroundColor Yellow
Write-Host $logFile -ForegroundColor Yellow
Write-Host "The extracted tunnel URL will be written to:" -ForegroundColor Yellow
Write-Host $urlFile -ForegroundColor Yellow
Write-Host ""

& $cloudflared tunnel --url http://localhost:8000 --protocol http2 --no-autoupdate 2>&1 | ForEach-Object {
  $line = $_.ToString()
  Add-Content -Path $logFile -Value $line
  Write-Host $line

  if ($line -match 'https://[A-Za-z0-9.-]+trycloudflare.com') {
    $url = $matches[0]
    Set-Content -Path $urlFile -Value $url
    Write-Host ""
    Write-Host "Quick tunnel URL:" -ForegroundColor Green
    Write-Host $url -ForegroundColor Green
    Write-Host ""
  }
}
