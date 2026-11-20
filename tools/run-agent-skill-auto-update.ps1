$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $env:LOCALAPPDATA 'MansoorAITeamManager\logs'
$logPath = Join-Path $logDirectory 'skill-auto-update.log'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

if (Test-Path -LiteralPath $logPath) {
    $log = Get-Item -LiteralPath $logPath
    if ($log.Length -gt 5MB) {
        Move-Item -LiteralPath $logPath -Destination ($logPath + '.1') -Force
    }
}

Add-Content -LiteralPath $logPath -Encoding utf8 -Value "[$(Get-Date -Format o)] Starting local agent skill refresh."
Push-Location $root
try {
    $output = & npm.cmd run agents:auto-update:run 2>&1
    $exitCode = $LASTEXITCODE
    $output | ForEach-Object { Add-Content -LiteralPath $logPath -Encoding utf8 -Value ([string]$_) }
    Add-Content -LiteralPath $logPath -Encoding utf8 -Value "[$(Get-Date -Format o)] Finished with exit code $exitCode."
    if ($exitCode -ne 0) { exit $exitCode }
} catch {
    Add-Content -LiteralPath $logPath -Encoding utf8 -Value "[$(Get-Date -Format o)] ERROR: $($_.Exception.Message)"
    exit 1
} finally {
    Pop-Location
}
