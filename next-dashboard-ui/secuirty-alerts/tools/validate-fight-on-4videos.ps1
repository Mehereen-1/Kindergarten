param(
    [string]$ApiBase = "http://127.0.0.1:8011",
    [string[]]$FightVideos,
    [string[]]$NormalVideos
)

$ErrorActionPreference = "Stop"

if (-not $FightVideos -or $FightVideos.Count -eq 0) {
    throw "Pass at least one fight video via -FightVideos"
}
if (-not $NormalVideos -or $NormalVideos.Count -eq 0) {
    throw "Pass at least one normal video via -NormalVideos"
}

function Analyze-One([string]$videoPath, [string]$expectedLabel) {
    if (-not (Test-Path $videoPath)) {
        throw "Video not found: $videoPath"
    }

    $jsonText = curl.exe -s -X POST "$ApiBase/anomaly/analyze-video" `
        -F "video=@$videoPath" `
        -F "camera_name=Calibration Camera" `
        -F "class_name=fight-calibration"

    if ([string]::IsNullOrWhiteSpace($jsonText)) {
        throw "Empty response for: $videoPath"
    }

    $resp = $jsonText | ConvertFrom-Json
    $fightRows = @($resp.model_results | Where-Object { $_.event_type -eq 'fight' })

    $best = $null
    if ($fightRows.Count -gt 0) {
        $best = $fightRows | Sort-Object confidence -Descending | Select-Object -First 1
    }

    $fightDetected = $false
    if ($fightRows.Count -gt 0) {
        $fightDetected = [bool](($fightRows | Where-Object { $_.detected -eq $true }).Count -gt 0)
    }

    $bestConfRaw = if ($best) { [double]$best.confidence } else { 0.0 }
    $bestConfPct = if ($bestConfRaw -le 1.0) { $bestConfRaw * 100.0 } else { $bestConfRaw }

    [PSCustomObject]@{
        expected      = $expectedLabel
        file          = [System.IO.Path]::GetFileName($videoPath)
        fightDetected = $fightDetected
        bestFightConf = [math]::Round($bestConfPct, 2)
        bestFightRaw  = [math]::Round($bestConfRaw, 5)
        status        = if (($expectedLabel -eq 'fight' -and $fightDetected) -or ($expectedLabel -eq 'normal' -and -not $fightDetected)) { 'PASS' } else { 'FAIL' }
    }
}

$rows = @()
foreach ($v in $FightVideos) {
    $rows += Analyze-One -videoPath $v -expectedLabel 'fight'
}
foreach ($v in $NormalVideos) {
    $rows += Analyze-One -videoPath $v -expectedLabel 'normal'
}

"`n=== Fight Validation Report ===" | Write-Host -ForegroundColor Cyan
$rows | Format-Table expected,file,fightDetected,bestFightConf,bestFightRaw,status -AutoSize

$fightScores = @($rows | Where-Object { $_.expected -eq 'fight' } | Select-Object -ExpandProperty bestFightConf)
$normalScores = @($rows | Where-Object { $_.expected -eq 'normal' } | Select-Object -ExpandProperty bestFightConf)

$minFight = ($fightScores | Measure-Object -Minimum).Minimum
$maxNormal = ($normalScores | Measure-Object -Maximum).Maximum

"`n=== Separation Check ===" | Write-Host -ForegroundColor Cyan
"Min fight confidence (%): $minFight" | Write-Host
"Max normal confidence (%): $maxNormal" | Write-Host

if ($minFight -gt $maxNormal) {
    $suggested = [math]::Round(($minFight + $maxNormal) / 2.0, 2)
    "Suggested ANOMALY_FIGHT_THRESHOLD: $suggested" | Write-Host -ForegroundColor Green
    "This dataset is separable with current model direction." | Write-Host -ForegroundColor Green
} else {
    "No clean separation on current settings (overlap exists)." | Write-Host -ForegroundColor Yellow
    "Try inversion toggle or retrain/fine-tune with domain clips." | Write-Host -ForegroundColor Yellow
}

$failCount = ($rows | Where-Object { $_.status -eq 'FAIL' }).Count
if ($failCount -eq 0) {
    "`nAll provided clips PASS on current profile." | Write-Host -ForegroundColor Green
} else {
    "`n$failCount clip(s) FAIL on current profile." | Write-Host -ForegroundColor Red
}
