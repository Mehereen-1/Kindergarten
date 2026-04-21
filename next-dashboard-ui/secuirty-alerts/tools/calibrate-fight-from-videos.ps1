param(
    [string]$ApiBase = "http://127.0.0.1:8011",
    [string[]]$FightVideos,
    [string[]]$NormalVideos,
    [double]$ThresholdStep = 0,
    [int]$RequestTimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"

if (-not $FightVideos -or $FightVideos.Count -eq 0) {
    throw "Provide at least one fight video via -FightVideos"
}
if (-not $NormalVideos -or $NormalVideos.Count -eq 0) {
    throw "Provide at least one normal video via -NormalVideos"
}
if ($ThresholdStep -ne 0 -and ($ThresholdStep -lt 0.01 -or $ThresholdStep -gt 20)) {
    throw "ThresholdStep must be 0 (auto) or between 0.01 and 20"
}
if ($RequestTimeoutSeconds -lt 10 -or $RequestTimeoutSeconds -gt 900) {
    throw "RequestTimeoutSeconds must be between 10 and 900"
}

function Normalize-Confidence([double]$raw) {
    if ($raw -le 1.0) {
        return [math]::Round($raw * 100.0, 4)
    }
    return [math]::Round($raw, 4)
}

function Invoke-AnalyzeVideo([string]$videoPath) {
    if (-not (Test-Path $videoPath)) {
        throw "Video not found: $videoPath"
    }

    Write-Host "  -> Analyzing $([System.IO.Path]::GetFileName($videoPath))" -ForegroundColor DarkGray

    $jsonText = curl.exe -s -X POST "$ApiBase/anomaly/analyze-video" `
        --connect-timeout 10 `
        --max-time $RequestTimeoutSeconds `
        -F "video=@$videoPath" `
        -F "camera_name=FightCalibration" `
        -F "class_name=fight-calibration"

    if ([string]::IsNullOrWhiteSpace($jsonText)) {
        throw "Empty response from anomaly service for $videoPath"
    }

    $obj = $jsonText | ConvertFrom-Json
    $fightRows = @($obj.model_results | Where-Object { $_.event_type -eq 'fight' })
    $best = $null
    if ($fightRows.Count -gt 0) {
        $best = $fightRows | Sort-Object confidence -Descending | Select-Object -First 1
    }

    $raw = if ($best) { [double]$best.confidence } else { 0.0 }
    $pct = Normalize-Confidence $raw

    return [PSCustomObject]@{
        file = $videoPath
        fileName = [System.IO.Path]::GetFileName($videoPath)
        raw = [math]::Round($raw, 6)
        pct = $pct
        status = [string]($obj.status)
        errors = @($obj.errors)
    }
}

function Evaluate-Config($samples, [string]$direction, [double]$thresholdPct) {
    $tp = 0; $tn = 0; $fp = 0; $fn = 0

    foreach ($s in $samples) {
        $predFight = $false
        if ($direction -eq 'high_is_fight') {
            $predFight = [double]$s.pct -ge $thresholdPct
        } else {
            $predFight = [double]$s.pct -le $thresholdPct
        }

        $isFight = [bool]$s.isFight
        if ($isFight -and $predFight) { $tp++ }
        elseif ($isFight -and -not $predFight) { $fn++ }
        elseif (-not $isFight -and $predFight) { $fp++ }
        else { $tn++ }
    }

    $total = [math]::Max(1, $samples.Count)
    $acc = ($tp + $tn) / $total

    return [PSCustomObject]@{
        direction = $direction
        thresholdPct = [math]::Round($thresholdPct, 2)
        thresholdEnv = [math]::Round($thresholdPct / 100.0, 4)
        accuracy = [math]::Round($acc * 100.0, 2)
        tp = $tp; tn = $tn; fp = $fp; fn = $fn
    }
}

Write-Host "\nCollecting fight sample scores..." -ForegroundColor Cyan
$rows = @()
foreach ($video in $FightVideos) {
    $score = Invoke-AnalyzeVideo -videoPath $video
    $rows += [PSCustomObject]@{
        expected = 'fight'
        isFight = $true
        file = $score.file
        fileName = $score.fileName
        raw = $score.raw
        pct = $score.pct
        status = $score.status
        errors = ($score.errors -join ' | ')
    }
}

Write-Host "Collecting normal sample scores..." -ForegroundColor Cyan
foreach ($video in $NormalVideos) {
    $score = Invoke-AnalyzeVideo -videoPath $video
    $rows += [PSCustomObject]@{
        expected = 'normal'
        isFight = $false
        file = $score.file
        fileName = $score.fileName
        raw = $score.raw
        pct = $score.pct
        status = $score.status
        errors = ($score.errors -join ' | ')
    }
}

Write-Host "\nRaw scores from current service:" -ForegroundColor Yellow
$rows | Select-Object expected,fileName,pct,raw,status,errors | Format-Table -AutoSize

$thresholdCandidates = @()

if ($ThresholdStep -gt 0) {
    for ($t = 0.0; $t -le 100.0; $t += $ThresholdStep) {
        $thresholdCandidates += [math]::Round([double]$t, 4)
    }
} else {
    $pctValues = @($rows | ForEach-Object { [double]$_.pct } | Sort-Object -Unique)
    if ($pctValues.Count -eq 0) {
        throw "No sample scores found to calibrate thresholds"
    }

    # Evaluate boundaries and score midpoints so close scores (e.g. 99.60 vs 99.80) can be separated.
    $thresholdCandidates += 0.0
    $thresholdCandidates += 100.0

    foreach ($v in $pctValues) {
        $thresholdCandidates += [math]::Round($v, 4)
    }

    for ($i = 0; $i -lt ($pctValues.Count - 1); $i++) {
        $mid = ($pctValues[$i] + $pctValues[$i + 1]) / 2.0
        $thresholdCandidates += [math]::Round($mid, 4)
    }

    $thresholdCandidates = @(
        $thresholdCandidates |
            Where-Object { $_ -ge 0.0 -and $_ -le 100.0 } |
            Sort-Object -Unique
    )
}

$best = $null
foreach ($direction in @('high_is_fight', 'low_is_fight')) {
    foreach ($t in $thresholdCandidates) {
        $res = Evaluate-Config -samples $rows -direction $direction -thresholdPct $t
        if ($null -eq $best) {
            $best = $res
            continue
        }

        # Prioritize accuracy, then lower FP, then lower FN.
        if (
            ($res.accuracy -gt $best.accuracy) -or
            (($res.accuracy -eq $best.accuracy) -and ($res.fp -lt $best.fp)) -or
            (($res.accuracy -eq $best.accuracy) -and ($res.fp -eq $best.fp) -and ($res.fn -lt $best.fn))
        ) {
            $best = $res
        }
    }
}

Write-Host "\nBest calibration from your videos:" -ForegroundColor Green
$best | Format-List

Write-Host "Recommended env settings:" -ForegroundColor Green
if ($best.direction -eq 'high_is_fight') {
    Write-Host "  ANOMALY_FIGHT_INVERT_SCORES=false"
    Write-Host "  ANOMALY_FIGHT_THRESHOLD=$($best.thresholdEnv)"
} else {
    Write-Host "  ANOMALY_FIGHT_INVERT_SCORES=true"
    Write-Host "  ANOMALY_FIGHT_THRESHOLD=$($best.thresholdEnv)"
}

Write-Host "\nPer-video corrected predictions under best config:" -ForegroundColor Cyan
$outRows = @()
foreach ($r in $rows) {
    $predFight = $false
    if ($best.direction -eq 'high_is_fight') {
        $predFight = [double]$r.pct -ge [double]$best.thresholdPct
    } else {
        $predFight = [double]$r.pct -le [double]$best.thresholdPct
    }

    $outRows += [PSCustomObject]@{
        expected = $r.expected
        fileName = $r.fileName
        scorePct = $r.pct
        predicted = if ($predFight) { 'fight' } else { 'normal' }
        result = if (($r.expected -eq 'fight' -and $predFight) -or ($r.expected -eq 'normal' -and -not $predFight)) { 'PASS' } else { 'FAIL' }
    }
}
$outRows | Format-Table -AutoSize

$failCount = ($outRows | Where-Object { $_.result -eq 'FAIL' }).Count
if ($failCount -eq 0) {
    Write-Host "\nAll videos PASS with this calibration." -ForegroundColor Green
} else {
    Write-Host "\n$failCount video(s) still FAIL even after best calibration." -ForegroundColor Red
    Write-Host "This means model overlap exists for your data and retraining/fine-tuning is required." -ForegroundColor Yellow
}
