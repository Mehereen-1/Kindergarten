param(
    [string]$ApiBase = "http://127.0.0.1:8011",
    [string]$FightVideo = "",
    [string]$FallVideo = "",
    [string]$FireVideo = "",
    [string]$AudioFile = "",
    [switch]$IncludeCrowd
)

$ErrorActionPreference = "Stop"

function Write-Section([string]$title) {
    Write-Host "" 
    Write-Host "==================================================" -ForegroundColor DarkGray
    Write-Host $title -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor DarkGray
}

function Parse-Json([string]$jsonText) {
    if ([string]::IsNullOrWhiteSpace($jsonText)) {
        throw "Empty response from service"
    }
    return $jsonText | ConvertFrom-Json
}

function Ensure-File([string]$path, [string]$label) {
    if ([string]::IsNullOrWhiteSpace($path)) {
        return $false
    }
    if (-not (Test-Path $path)) {
        throw "$label file not found: $path"
    }
    return $true
}

function Get-ModelSummary($response, [string]$expectedEvent) {
    $rows = @()

    if ($null -eq $response.model_results) {
        return $rows
    }

    foreach ($item in $response.model_results) {
        $rows += [PSCustomObject]@{
            model_name = [string]$item.model_name
            event_type = [string]$item.event_type
            detected   = [bool]$item.detected
            confidence = [math]::Round([double]$item.confidence, 4)
            frame_index = [int]$item.frame_index
            expected_match = ([string]$item.event_type -eq $expectedEvent)
        }
    }

    return $rows
}

function Analyze-Video([string]$label, [string]$videoPath, [string]$expectedEvent) {
    Write-Section "$label (expected: $expectedEvent)"

    $jsonText = curl.exe -s -X POST "$ApiBase/anomaly/analyze-video" `
        -F "video=@$videoPath" `
        -F "camera_name=Model Test Camera" `
        -F "class_name=model-test" 

    $response = Parse-Json $jsonText

    if ($response.errors -and $response.errors.Count -gt 0) {
        Write-Host "Service errors:" -ForegroundColor Yellow
        $response.errors | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
    }

    $summary = Get-ModelSummary $response $expectedEvent
    if ($summary.Count -eq 0) {
        Write-Host "No model_results returned." -ForegroundColor Red
        return
    }

    $summary |
        Sort-Object confidence -Descending |
        Format-Table model_name,event_type,detected,confidence,frame_index,expected_match -AutoSize

    $expectedRows = $summary | Where-Object { $_.event_type -eq $expectedEvent }
    if ($expectedRows.Count -eq 0) {
        Write-Host "Expected model event '$expectedEvent' not present in model_results." -ForegroundColor Red
        return
    }

    $bestExpected = $expectedRows | Sort-Object confidence -Descending | Select-Object -First 1
    $status = if ($bestExpected.detected) { "DETECTED" } else { "NOT DETECTED" }
    $color = if ($bestExpected.detected) { "Green" } else { "Red" }
    Write-Host "Expected event result: $status | confidence=$($bestExpected.confidence) | model=$($bestExpected.model_name)" -ForegroundColor $color

    if ($response.alerts -and $response.alerts.Count -gt 0) {
        Write-Host "Fused alerts:" -ForegroundColor Magenta
        foreach ($alert in $response.alerts) {
            Write-Host "- $($alert.type) | severity=$($alert.severity) | conf=$([math]::Round([double]$alert.confidence, 4))"
        }
    }
}

function Analyze-Audio([string]$audioPath) {
    Write-Section "Audio Test (expected: scream/distress/alarm)"

    $jsonText = curl.exe -s -X POST "$ApiBase/anomaly/analyze-audio" `
        -F "audio=@$audioPath" `
        -F "camera_name=Model Test Camera" `
        -F "class_name=model-test"

    $response = Parse-Json $jsonText

    if ($response.errors -and $response.errors.Count -gt 0) {
        Write-Host "Service errors:" -ForegroundColor Yellow
        $response.errors | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
    }

    $rows = @()
    foreach ($item in $response.model_results) {
        $rows += [PSCustomObject]@{
            model_name = [string]$item.model_name
            event_type = [string]$item.event_type
            label = [string]$item.label
            detected = [bool]$item.detected
            confidence = [math]::Round([double]$item.confidence, 4)
        }
    }

    if ($rows.Count -eq 0) {
        Write-Host "No model_results returned." -ForegroundColor Red
        return
    }

    $rows | Sort-Object confidence -Descending | Format-Table model_name,event_type,label,detected,confidence -AutoSize
}

Write-Section "Anomaly Service Health"
$health = Invoke-RestMethod -Method Get -Uri "$ApiBase/anomaly/health"
Write-Host "Status: $($health.status) | initialized=$($health.initialized)"

$models = @($health.models)
$models |
    Select-Object name,event_type,enabled,loaded,threshold,@{Name='load_error';Expression={ $_.extra.load_error }} |
    Format-Table -AutoSize

if (Ensure-File $FightVideo "Fight video") {
    Analyze-Video -label "Fight Model Test" -videoPath $FightVideo -expectedEvent "fight"
}

if (Ensure-File $FallVideo "Fall video") {
    Analyze-Video -label "Fall Model Test" -videoPath $FallVideo -expectedEvent "fall"
}

if (Ensure-File $FireVideo "Fire video") {
    Analyze-Video -label "Fire Model Test" -videoPath $FireVideo -expectedEvent "fire"
}

if ($IncludeCrowd -and (Ensure-File $FightVideo "Crowd test video")) {
    Analyze-Video -label "Crowd Model Test" -videoPath $FightVideo -expectedEvent "crowd"
}

if (Ensure-File $AudioFile "Audio file") {
    Analyze-Audio -audioPath $AudioFile
}

Write-Host "" 
Write-Host "Done. Compare each expected event's DETECTED status and confidence." -ForegroundColor Cyan
