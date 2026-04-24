$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot"

# Deterministic validation profile for short benchmark clips.
# Goal: reduce run-to-run variance while calibrating fight behavior.
$env:ANOMALY_ONNX_PREFER_DML = "true"
$env:ANOMALY_REALTIME_AUTOSTRIDE = "false"
$env:ANOMALY_REALTIME_TARGET_FPS = "12"
$env:ANOMALY_REALTIME_MAX_STRIDE = "1"

$env:ANOMALY_FRAME_STRIDE = "1"
$env:ANOMALY_FIGHT_RUN_EVERY = "1"
$env:ANOMALY_FALL_RUN_EVERY = "2"
$env:ANOMALY_FIRE_RUN_EVERY = "3"

# Calibrated from local benchmark clips (fight.mp4 vs normal.mp4).
$env:ANOMALY_FIGHT_INVERT_SCORES = "false"
$env:ANOMALY_FIGHT_THRESHOLD = "0.997"
$env:ANOMALY_FIGHT_ON_MARGIN = "0.04"
$env:ANOMALY_FIGHT_OFF_MARGIN = "0.10"
$env:ANOMALY_FIGHT_MIN_ON_FRAMES = "2"
$env:ANOMALY_FIGHT_MIN_OFF_FRAMES = "2"

$env:ANOMALY_FALL_THRESHOLD = "0.84"
$env:ANOMALY_FIRE_THRESHOLD = "0.75"

$env:ANOMALY_FUSION_MEDIUM_CONF = "0.72"
$env:ANOMALY_FUSION_HIGH_CONF = "0.88"
$env:ANOMALY_FUSION_GAP_FRAMES = "18"
$env:ANOMALY_FUSION_FIGHT_MIN_CONF = "0.997"
$env:ANOMALY_FUSION_FALL_MIN_CONF = "0.86"
$env:ANOMALY_FUSION_FIRE_MIN_CONF = "0.78"
$env:ANOMALY_ENABLE_AMBIGUOUS_MOTION_ALERTS = "false"

Write-Host "Starting anomaly service with FIGHT-VALIDATION profile..." -ForegroundColor Cyan
Write-Host "Use this only for clip-by-clip calibration, not final realtime deployment." -ForegroundColor Yellow

$port = $env:ANOMALY_SERVICE_PORT
if ([string]::IsNullOrWhiteSpace($port)) {
    $port = "8011"
}

$explicitPython = $env:ANOMALY_SERVICE_PYTHON
$windowsPython310 = if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'Python\pythoncore-3.10-64\python.exe' } else { '' }
$localPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
$localVenvReady = Test-Path (Join-Path $PSScriptRoot '.venv\.ready')
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$repoPython = Join-Path $repoRoot '.venv\Scripts\python.exe'
$pythonExe = if (-not [string]::IsNullOrWhiteSpace($explicitPython) -and (Test-Path $explicitPython)) {
    $explicitPython
} elseif (-not [string]::IsNullOrWhiteSpace($windowsPython310) -and (Test-Path $windowsPython310)) {
    $windowsPython310
} elseif ($localVenvReady -and (Test-Path $localPython)) {
    (Resolve-Path $localPython).Path
} elseif (Test-Path $repoPython) {
    (Resolve-Path $repoPython).Path
} else {
    'python'
}

& $pythonExe main.py --serve --host 0.0.0.0 --port $port
