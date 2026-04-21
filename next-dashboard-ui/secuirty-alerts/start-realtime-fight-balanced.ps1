$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot"

# Balanced profile: reduce false positives without killing fight recall.
$env:ANOMALY_ONNX_PREFER_DML = "true"
$env:ANOMALY_REALTIME_AUTOSTRIDE = "true"
$env:ANOMALY_REALTIME_TARGET_FPS = "10"
$env:ANOMALY_REALTIME_MAX_STRIDE = "4"

$env:ANOMALY_FRAME_STRIDE = "2"
$env:ANOMALY_FIGHT_RUN_EVERY = "2"
$env:ANOMALY_FALL_RUN_EVERY = "2"
$env:ANOMALY_FIRE_RUN_EVERY = "3"

# Calibrated fight threshold from local benchmark clips.
$env:ANOMALY_FIGHT_THRESHOLD = "0.997"
$env:ANOMALY_FALL_THRESHOLD = "0.84"
$env:ANOMALY_FIRE_THRESHOLD = "0.75"

$env:ANOMALY_FIGHT_INVERT_SCORES = "false"

$env:ANOMALY_FIGHT_ON_MARGIN = "0.04"
$env:ANOMALY_FIGHT_OFF_MARGIN = "0.10"
$env:ANOMALY_FIGHT_MIN_ON_FRAMES = "3"
$env:ANOMALY_FIGHT_MIN_OFF_FRAMES = "3"

$env:ANOMALY_FALL_ON_MARGIN = "0.02"
$env:ANOMALY_FALL_OFF_MARGIN = "0.06"
$env:ANOMALY_FALL_MIN_ON_FRAMES = "4"
$env:ANOMALY_FALL_MIN_OFF_FRAMES = "4"

$env:ANOMALY_AUDIO_THRESHOLD = "0.35"
$env:ANOMALY_AUDIO_INSTANT_THRESHOLD = "0.55"
$env:ANOMALY_AUDIO_SUSTAIN_THRESHOLD = "0.35"

$env:ANOMALY_FUSION_MEDIUM_CONF = "0.72"
$env:ANOMALY_FUSION_HIGH_CONF = "0.88"
$env:ANOMALY_FUSION_GAP_FRAMES = "18"
$env:ANOMALY_FUSION_FIGHT_MIN_CONF = "0.997"
$env:ANOMALY_FUSION_FALL_MIN_CONF = "0.86"
$env:ANOMALY_FUSION_FIRE_MIN_CONF = "0.78"
$env:ANOMALY_ENABLE_AMBIGUOUS_MOTION_ALERTS = "false"

Write-Host "Starting anomaly service with FIGHT-BALANCED profile..." -ForegroundColor Cyan
Write-Host "Use this profile to calibrate fight recall vs false positives." -ForegroundColor Yellow

$port = $env:ANOMALY_SERVICE_PORT
if ([string]::IsNullOrWhiteSpace($port)) {
    $port = "8011"
}

python main.py --serve --host 0.0.0.0 --port $port
