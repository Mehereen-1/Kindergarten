$host.UI.RawUI.WindowTitle = "Attendance Backend"
Set-Location "C:\system project\Kindergarten\next-dashboard-ui\attendance_cctv"

$logFile = "C:\system project\Kindergarten\next-dashboard-ui\attendance_cctv\backend-run.log"
Remove-Item $logFile -Force -ErrorAction SilentlyContinue

Write-Host "Starting attendance backend on http://localhost:8000" -ForegroundColor Cyan
Write-Host "Backend log file:" -ForegroundColor Yellow
Write-Host $logFile -ForegroundColor Yellow
Write-Host ""

cmd /c "C:\system project\Kindergarten\next-dashboard-ui\attendance_cctv\start-attendance-backend.bat" 2>&1 | Tee-Object -FilePath $logFile -Append
