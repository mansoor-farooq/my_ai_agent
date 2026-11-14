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
    (Join-Path $hub 'tools\tests\ultra-agent-v4-core-loop.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v4-task-workspaces.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v4-managed-mcp.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v4-managed-runtime.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v5-action-manifest.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v5-durable-ledger.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v5-managed-mcp-approval.test.mjs') `
    (Join-Path $hub 'tools\tests\agent-security-fixtures.test.mjs') `
    (Join-Path $hub 'tools\tests\content-hash.test.mjs') `
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

  $packageVersion = [string](Get-Content -LiteralPath (Join-Path $buildOutput 'plugin.json') -Raw | ConvertFrom-Json).version
  $versionedPackage = Join-Path $dist ("mansoor-agent-hub-" + $packageVersion)
  if (Test-Path -LiteralPath $versionedPackage -PathType Container) { Remove-Item -LiteralPath $versionedPackage -Recurse -Force }
  Expand-Archive -LiteralPath $archive -DestinationPath $versionedPackage -Force
  if (-not (Test-Path -LiteralPath (Join-Path $versionedPackage 'Install-Mansoor-Agent-Team.ps1') -PathType Leaf)) {
    throw "Versioned extracted package is incomplete: $versionedPackage"
  }
  Write-Host "VERSIONED PACKAGE REFRESHED / $versionedPackage" -ForegroundColor Green

  $extractedPackage = Join-Path $dist 'mansoor-agent-hub'
  $extractedPluginMarker = Join-Path $extractedPackage 'plugin.json'
  $extractedInstallerMarker = Join-Path $extractedPackage 'Install-Mansoor-Agent-Team.cmd'
  $aliasStage = Join-Path $dist ('mansoor-agent-hub-refresh-' + [guid]::NewGuid().ToString('N'))
  $aliasBackup = Join-Path $dist ('mansoor-agent-hub-backup-' + [guid]::NewGuid().ToString('N'))
  try {
    Expand-Archive -LiteralPath $archive -DestinationPath $aliasStage -Force
    if (Test-Path -LiteralPath $extractedPackage -PathType Container) {
      $existingPackageEntries = @(Get-ChildItem -LiteralPath $extractedPackage -Force -ErrorAction SilentlyContinue)
      if ($existingPackageEntries.Count -gt 0 -and (-not (Test-Path -LiteralPath $extractedPluginMarker -PathType Leaf) -or -not (Test-Path -LiteralPath $extractedInstallerMarker -PathType Leaf))) {
        throw "Refusing to replace non-package distribution folder: $extractedPackage"
      }
      Move-Item -LiteralPath $extractedPackage -Destination $aliasBackup
    }
    Move-Item -LiteralPath $aliasStage -Destination $extractedPackage
    if (-not (Test-Path -LiteralPath (Join-Path $extractedPackage 'Install-Mansoor-Agent-Team.ps1') -PathType Leaf)) {
      throw "Extracted distribution package is incomplete: $extractedPackage"
    }
    if (Test-Path -LiteralPath $aliasBackup -PathType Container) { Remove-Item -LiteralPath $aliasBackup -Recurse -Force }
    Write-Host "EXTRACTED PACKAGE REFRESHED / $extractedPackage" -ForegroundColor Green
  } catch {
    if (Test-Path -LiteralPath $aliasStage -PathType Container) { Remove-Item -LiteralPath $aliasStage -Recurse -Force -ErrorAction SilentlyContinue }
    if ((-not (Test-Path -LiteralPath $extractedPackage -PathType Container)) -and (Test-Path -LiteralPath $aliasBackup -PathType Container)) {
      Move-Item -LiteralPath $aliasBackup -Destination $extractedPackage -ErrorAction SilentlyContinue
    }
    Write-Host ("EXTRACTED PACKAGE REFRESH DEFERRED / " + $_.Exception.Message) -ForegroundColor Yellow
    Write-Host "Use the versioned package until the old installer window is closed: $versionedPackage" -ForegroundColor Yellow
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

      $profileRootCandidates = [System.Collections.Generic.List[string]]::new()
      function Add-ProfileRootCandidate([string]$Path, [bool]$IsAgentRoot = $false) {
        if ([string]::IsNullOrWhiteSpace($Path)) { return }
        $expanded = [Environment]::ExpandEnvironmentVariables($Path.Trim())
        if (-not [IO.Path]::IsPathRooted($expanded)) { return }
        $resolved = [IO.Path]::GetFullPath($expanded).TrimEnd([IO.Path]::DirectorySeparatorChar)
        if (-not $IsAgentRoot -and $resolved -notmatch '[\\/]agents$') { $resolved = Join-Path $resolved 'agents' }
        if (-not ($profileRootCandidates | Where-Object { $_ -ieq $resolved })) { $profileRootCandidates.Add($resolved) }
      }
      Add-ProfileRootCandidate (Join-Path $env:USERPROFILE '.gemini\config\agents') $true
      foreach ($name in @('MANSOOR_AGENT_ROOT', 'AGY_CONFIG_DIR', 'ANTIGRAVITY_CONFIG_DIR', 'GEMINI_CONFIG_DIR')) {
        $value = [Environment]::GetEnvironmentVariable($name)
        if ($value) { Add-ProfileRootCandidate $value ($name -eq 'MANSOOR_AGENT_ROOT') }
      }
      $geminiHome = [Environment]::GetEnvironmentVariable('GEMINI_HOME')
      if ($geminiHome) { Add-ProfileRootCandidate (Join-Path $geminiHome 'config') }
      Add-ProfileRootCandidate (Join-Path $env:USERPROFILE '.geminiconfigagents') $true
      if ($installedHub -and -not [string]::IsNullOrWhiteSpace([string]$installedHub.path)) {
        $pluginConfigRoot = Split-Path -Parent (Split-Path -Parent ([string]$installedHub.path))
        Add-ProfileRootCandidate (Join-Path $pluginConfigRoot 'agents') $true
      }

      $installedProfileRoot = $null
      foreach ($candidate in $profileRootCandidates) {
        $managerProfile = Join-Path $candidate 'production-orchestrator\agent.md'
        $uiProfile = Join-Path $candidate 'mansoor-ui-specialist\agent.md'
        $flutterProfile = Join-Path $candidate 'flutter-mobile-specialist\agent.md'
        if (-not (Test-Path -LiteralPath $managerProfile -PathType Leaf) -or -not (Test-Path -LiteralPath $uiProfile -PathType Leaf) -or -not (Test-Path -LiteralPath $flutterProfile -PathType Leaf)) { continue }
        $managerText = Get-Content -LiteralPath $managerProfile -Raw
        if ($managerText -match '(?im)^\s*internal routing id:\s*.?production-orchestrator') {
          $installedProfileRoot = $candidate
          break
        }
      }

      $pluginDetected = $installedHub -and -not [string]::IsNullOrWhiteSpace([string]$installedHub.path)
      if (-not $pluginDetected -and -not $installedProfileRoot) {
        Write-Host 'AUTO UPDATE SKIPPED / no Mansoor plugin or installed agent-profile roots were detected; run the bundled installer once.' -ForegroundColor Yellow
      } else {
        Write-Host ''
        $targetSummary = if ($pluginDetected) { [string]$installedHub.path } else { $installedProfileRoot }
        $runningAntigravity = @(Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue)
        if ($runningAntigravity.Count -gt 0) {
          Write-Host "AUTO UPDATE / Antigravity is running ($($runningAntigravity.Count) process(es)); the installer will request a graceful close before updating." -ForegroundColor Cyan
        }
        Write-Host "AUTO UPDATE / existing Mansoor installation detected at $targetSummary; applying this build..." -ForegroundColor Cyan
        $autoInstaller = Join-Path $buildOutput 'Install-Mansoor-Agent-Team.ps1'
        & (Join-Path $PSHOME 'powershell.exe') -NoProfile -ExecutionPolicy Bypass -File $autoInstaller
        $autoInstallExit = $LASTEXITCODE
        if ($autoInstallExit -eq 42) {
          Write-Host 'AUTO UPDATE DEFERRED / Antigravity did not close within the safe timeout; ZIP remains ready and the active installation was not changed.' -ForegroundColor Yellow
        } elseif ($autoInstallExit -ne 0) {
          throw "Automatic Mansoor Agent Hub update failed (exit $autoInstallExit)."
        } else {
          Write-Host 'AUTO UPDATE COMPLETE / active plugin and profile roots were synchronized and hash-verified.' -ForegroundColor Green
        }
      }
    }
  } else {
    Write-Host 'AUTO UPDATE DISABLED / package-only build requested with -SkipAutoInstall.' -ForegroundColor DarkGray
  }
} finally {
  if ($buildOutput -and (Test-Path -LiteralPath $buildOutput)) { Remove-Item -LiteralPath $buildOutput -Recurse -Force -ErrorAction SilentlyContinue }
  Set-Location -LiteralPath $previousLocation
}
