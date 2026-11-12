param(
  [switch]$SkipAutoInstall
)

$ErrorActionPreference = 'Stop'
$hub = Split-Path -Parent $MyInvocation.MyCommand.Path
$dist = Join-Path $hub 'dist'
$buildOutput = Join-Path $dist ('build-staging-' + [guid]::NewGuid().ToString('N'))
$previousLocation = Get-Location

try {
  Set-Location -LiteralPath $hub

  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) { throw 'Node.js is required. Install Node.js, then run the build again.' }

  $defaultKey = Join-Path $env:USERPROFILE '.mansoor-agent-keys\release-ed25519-private.pem'
  $keyPath = if ([string]::IsNullOrWhiteSpace($env:MANSOOR_AGENT_SIGNING_KEY)) { $defaultKey } else { [IO.Path]::GetFullPath($env:MANSOOR_AGENT_SIGNING_KEY) }

  if (Test-Path -LiteralPath $keyPath -PathType Leaf) {
    Write-Host 'Owner signing key found. Reusing the existing key.'
  } elseif ($keyPath -eq $defaultKey) {
    Write-Host 'Owner signing key not found. Creating it once...'
    & $node.Source (Join-Path $hub 'tools\create-owner-signing-key.mjs')
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $keyPath -PathType Leaf)) {
      throw 'Owner signing key creation failed.'
    }
  } else {
    throw "The custom signing key path does not exist: $keyPath"
  }

  Write-Host ''
  Write-Host 'Refreshing owner source checksums...'
  & $node.Source (Join-Path $hub 'tools\update-key-checksums.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Source checksum refresh failed.' }

  Write-Host ''
  Write-Host 'Step 1/3: Building and signing the portable ZIP...'
  & (Join-Path $hub 'install-antigravity-portable.ps1') -OutputDirectory $buildOutput -KeepOutput

  Write-Host ''
  Write-Host 'Step 2/3: Running the agent-hub doctor...'
  & $node.Source (Join-Path $hub 'tools\agent-hub-doctor.mjs') --format json
  if ($LASTEXITCODE -ne 0) { throw 'Agent-hub doctor failed.' }

  Write-Host ''
  Write-Host 'Step 3/3: Running focused tests...'
  & $node.Source --test `
    (Join-Path $hub 'tools\tests\package-signing.test.mjs') `
    (Join-Path $hub 'tools\tests\agent-hub-doctor.test.mjs') `
    (Join-Path $hub 'tools\tests\backend-ml-router.test.mjs') `
    (Join-Path $hub 'tools\tests\portable-plugin-contents.test.mjs') `
    (Join-Path $hub 'tools\tests\rule-governance.test.mjs') `
    (Join-Path $hub 'tools\tests\native-agent-activity-contract.test.mjs') `
    (Join-Path $hub 'tools\tests\project-rag.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v2.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-state.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-mode.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-context.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-evaluation.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-delegation.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-policy-activity.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v4-control.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v4-managed-runtime.test.mjs') `
    (Join-Path $hub 'tools\tests\agent-security-fixtures.test.mjs') `
    (Join-Path $hub 'tools\tests\global-rule-sync.test.mjs') `
    (Join-Path $hub 'tools\tests\antigravity-runtime-preflight.test.mjs') `
    (Join-Path $hub 'tools\tests\antigravity-pretool-guard.test.mjs') `
    (Join-Path $hub 'tools\tests\agent-benchmark.test.mjs') `
    (Join-Path $hub 'tools\tests\benchmark-corpus.test.mjs') `
    (Join-Path $hub 'tools\tests\secret-scan.test.mjs') `
    (Join-Path $hub 'tools\tests\rag-ci-gate.test.mjs') `
    (Join-Path $hub 'tools\tests\ci-workflow.test.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Focused tests failed.' }

  $archive = Join-Path $hub 'dist\mansoor-agent-hub.zip'
  if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) { throw 'Build completed without the expected ZIP.' }
  $sha256 = [Security.Cryptography.SHA256]::Create()
  try {
    $hashBytes = $sha256.ComputeHash([IO.File]::ReadAllBytes($archive))
    $hash = -join ($hashBytes | ForEach-Object { $_.ToString('X2') })
  } finally {
    $sha256.Dispose()
  }

  Write-Host ''
  Write-Host 'BUILD COMPLETE' -ForegroundColor Green
  Write-Host "Share this file: $archive"
  Write-Host "SHA256: $hash"

  if (-not $SkipAutoInstall) {
    $agyForUpdate = Get-Command agy -ErrorAction SilentlyContinue
    if (-not $agyForUpdate) {
      Write-Host 'AUTO UPDATE SKIPPED / Antigravity CLI (agy) is not available; the ZIP was built successfully.' -ForegroundColor Yellow
    } else {
      $inventoryJson = & $agyForUpdate.Source plugin list --json 2>$null
      $installedHub = $null
      try {
        $installedHub = @((ConvertFrom-Json -InputObject ($inventoryJson -join "`n")) | Where-Object { $_.name -eq 'mansoor-agent-hub' } | Select-Object -First 1)
      } catch {
        $installedHub = $null
      }

      if (-not $installedHub -or [string]::IsNullOrWhiteSpace([string]$installedHub.path)) {
        Write-Host 'AUTO UPDATE SKIPPED / no existing Mansoor Agent Hub installation was detected; run the bundled installer once.' -ForegroundColor Yellow
      } else {
        Write-Host ''
        Write-Host 'AUTO UPDATE / existing Mansoor Agent Hub detected; applying this build to the active installation...' -ForegroundColor Cyan
        $autoInstaller = Join-Path $buildOutput 'Install-Mansoor-Agent-Team.ps1'
        & (Join-Path $PSHOME 'powershell.exe') -NoProfile -ExecutionPolicy Bypass -File $autoInstaller
        if ($LASTEXITCODE -ne 0) { throw "Automatic Mansoor Agent Hub update failed (exit $LASTEXITCODE)." }
        Write-Host 'AUTO UPDATE COMPLETE / active plugin and profile roots were synchronized and hash-verified.' -ForegroundColor Green
      }
    }
  } else {
    Write-Host 'AUTO UPDATE DISABLED / package-only build requested with -SkipAutoInstall.' -ForegroundColor DarkGray
  }
} finally {
  if ($buildOutput -and (Test-Path -LiteralPath $buildOutput)) { Remove-Item -LiteralPath $buildOutput -Recurse -Force -ErrorAction SilentlyContinue }
  Set-Location -LiteralPath $previousLocation
}
