$urlFile = "C:\system project\Kindergarten\next-dashboard-ui\attendance_cctv\quick-tunnel-url.txt"

if (-not (Test-Path $urlFile)) {
  Write-Host "No quick tunnel URL file found yet." -ForegroundColor Red
  Write-Host "Start the tunnel first with start-attendance-quick-tunnel.ps1" -ForegroundColor Yellow
  exit 1
}

$url = (Get-Content -Path $urlFile -Raw).Trim()

if (-not $url) {
  Write-Host "Quick tunnel URL file is empty." -ForegroundColor Red
  exit 1
}

Write-Host "Quick tunnel URL:" -ForegroundColor Cyan
Write-Host $url -ForegroundColor Green
Write-Host ""

try {
  $health = Invoke-RestMethod -Uri "$url/health" -TimeoutSec 20
  Write-Host "Tunnel health check succeeded." -ForegroundColor Green
  $health | ConvertTo-Json -Depth 6
} catch {
  Write-Host "Tunnel health check failed:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
