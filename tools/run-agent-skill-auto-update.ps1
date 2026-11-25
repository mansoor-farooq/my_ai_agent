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
    $gitCommand = Get-Command git.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    $gitCandidates = @(
        (Join-Path ${env:ProgramFiles} 'Git\cmd\git.exe'),
        (Join-Path ${env:LOCALAPPDATA} 'Programs\Git\cmd\git.exe')
    )
    if ($gitCommand -and (Test-Path -LiteralPath $gitCommand.Source)) { $gitCandidates += $gitCommand.Source }
    $gitPath = $gitCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ([string]::IsNullOrWhiteSpace($gitPath)) {
        Add-Content -LiteralPath $logPath -Encoding utf8 -Value "[$(Get-Date -Format o)] DEFERRED: Git executable was not found in the scheduled-task environment."
        exit 0
    }
    $gitRoot = (& $gitPath -C $root rev-parse --show-toplevel 2>$null | Select-Object -First 1)
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($gitRoot)) {
        Add-Content -LiteralPath $logPath -Encoding utf8 -Value "[$(Get-Date -Format o)] DEFERRED: local agent hub checkout is not a Git repository."
        exit 0
    }
    $dirty = & $gitPath -C $root status --porcelain --untracked-files=all 2>$null
    if ($LASTEXITCODE -ne 0) {
        Add-Content -LiteralPath $logPath -Encoding utf8 -Value "[$(Get-Date -Format o)] DEFERRED: Git status could not be read."
        exit 0
    }
    if ($dirty) {
        Add-Content -LiteralPath $logPath -Encoding utf8 -Value "[$(Get-Date -Format o)] DEFERRED: local checkout has uncommitted changes; no automatic pull or install was attempted."
        exit 0
    }
    $branch = (& $gitPath -C $root branch --show-current 2>$null | Select-Object -First 1).Trim()
    $upstream = (& $gitPath -C $root rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null | Select-Object -First 1).Trim()
    if ([string]::IsNullOrWhiteSpace($branch) -or [string]::IsNullOrWhiteSpace($upstream) -or -not $upstream.StartsWith('origin/')) {
        Add-Content -LiteralPath $logPath -Encoding utf8 -Value "[$(Get-Date -Format o)] DEFERRED: branch '$branch' has no origin upstream; no automatic pull was attempted."
        exit 0
    }
    & $gitPath -C $root fetch --quiet origin 2>&1 | ForEach-Object { Add-Content -LiteralPath $logPath -Encoding utf8 -Value ([string]$_) }
    if ($LASTEXITCODE -ne 0) {
        Add-Content -LiteralPath $logPath -Encoding utf8 -Value "[$(Get-Date -Format o)] DEFERRED: origin fetch failed; local installations were not changed."
        exit 0
    }
    $counts = (& $gitPath -C $root rev-list --left-right --count "$branch...$upstream" 2>$null | Select-Object -First 1).Trim() -split '\s+'
    if ($counts.Count -ne 2) {
        Add-Content -LiteralPath $logPath -Encoding utf8 -Value "[$(Get-Date -Format o)] DEFERRED: could not compare local branch '$branch' with '$upstream'."
        exit 0
    }
    $ahead = [int]$counts[0]
    $behind = [int]$counts[1]
    if ($ahead -gt 0 -and $behind -gt 0) {
        Add-Content -LiteralPath $logPath -Encoding utf8 -Value "[$(Get-Date -Format o)] DEFERRED: local branch '$branch' diverged from '$upstream'; manual reconciliation is required."
        exit 0
    }
    if ($behind -gt 0) {
        Add-Content -LiteralPath $logPath -Encoding utf8 -Value "[$(Get-Date -Format o)] Fast-forwarding '$branch' from '$upstream'."
        & $gitPath -C $root merge --ff-only $upstream 2>&1 | ForEach-Object { Add-Content -LiteralPath $logPath -Encoding utf8 -Value ([string]$_) }
        if ($LASTEXITCODE -ne 0) {
            Add-Content -LiteralPath $logPath -Encoding utf8 -Value "[$(Get-Date -Format o)] DEFERRED: fast-forward failed; local installations were not changed."
            exit 0
        }
    }
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
