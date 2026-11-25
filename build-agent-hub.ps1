param(
  [switch]$SkipAutoInstall
)

$ErrorActionPreference = 'Stop'
$hub = Split-Path -Parent $MyInvocation.MyCommand.Path
$dist = Join-Path $hub 'dist'
$buildId = [guid]::NewGuid().ToString('N')
$buildOutput = Join-Path $dist ('build-staging-' + $buildId)
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
  & $node.Source (Join-Path $hub 'tools\generate-skill-provenance.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Skill provenance refresh failed.' }
  & $node.Source (Join-Path $hub 'tools\update-key-checksums.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Source checksum refresh failed.' }

  Write-Host ''
  Write-Host 'Step 1/3: Building and signing the portable ZIP...'
  $packageVersion = [string](Get-Content -LiteralPath (Join-Path $hub 'package.json') -Raw | ConvertFrom-Json).version
  if ([string]::IsNullOrWhiteSpace($packageVersion)) { throw 'Build output has no package version.' }
  $archive = Join-Path $dist ("mansoor-agent-hub-$packageVersion-$($buildId.Substring(0, 8)).zip")
  & (Join-Path $hub 'install-antigravity-portable.ps1') -OutputDirectory $buildOutput -ArchivePath $archive -KeepOutput

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
    (Join-Path $hub 'tools\tests\sync-antigravity-agent-profiles.test.mjs') `
    (Join-Path $hub 'tools\tests\rule-governance.test.mjs') `
    (Join-Path $hub 'tools\tests\native-agent-activity-contract.test.mjs') `
    (Join-Path $hub 'tools\tests\project-rag.test.mjs') `
    (Join-Path $hub 'tools\tests\rag-setup.test.mjs') `
    (Join-Path $hub 'tools\tests\antigravity-local-context.test.mjs') `
    (Join-Path $hub 'tools\tests\antigravity-system-doctor.test.mjs') `
    (Join-Path $hub 'tools\tests\prompt-contract.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v2.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-state.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-mode.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-context.test.mjs') `
    (Join-Path $hub 'tools\tests\repository-map.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-evaluation.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-delegation.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-policy-activity.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v4-control.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v4-core-loop.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v4-task-workspaces.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-daemon.test.mjs') `
    (Join-Path $hub 'tools\tests\host-resilience.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v4-managed-mcp.test.mjs') `
    (Join-Path $hub 'tools\tests\antigravity-control-plane.test.mjs') `
    (Join-Path $hub 'tools\tests\context-intelligence-v2.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v4-managed-runtime.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v5-action-manifest.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v5-durable-ledger.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v5-managed-mcp-approval.test.mjs') `
    (Join-Path $hub 'tools\tests\agent-security-fixtures.test.mjs') `
    (Join-Path $hub 'tools\tests\content-hash.test.mjs') `
    (Join-Path $hub 'tools\tests\global-rule-sync.test.mjs') `
    (Join-Path $hub 'tools\tests\antigravity-runtime-preflight.test.mjs') `
    (Join-Path $hub 'tools\tests\antigravity-pretool-guard.test.mjs') `
    (Join-Path $hub 'tools\tests\antigravity-hook-wrapper.test.mjs') `
    (Join-Path $hub 'tools\tests\gemini-cli-team.test.mjs') `
    (Join-Path $hub 'tools\tests\prompt-contract.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v5-command-approval-policy.test.mjs') `
    (Join-Path $hub 'tools\tests\sync-antigravity-permissions.test.mjs') `
    (Join-Path $hub 'tools\tests\manager-script-registry.test.mjs') `
    (Join-Path $hub 'tools\tests\agent-benchmark.test.mjs') `
    (Join-Path $hub 'tools\tests\benchmark-corpus.test.mjs') `
    (Join-Path $hub 'tools\tests\secret-scan.test.mjs') `
    (Join-Path $hub 'tools\tests\rag-ci-gate.test.mjs') `
    (Join-Path $hub 'tools\tests\ci-workflow.test.mjs') `
    (Join-Path $hub 'tools\tests\open-source-first-gate.test.mjs') `
    (Join-Path $hub 'tools\tests\premium-agent-router.test.mjs') `
    (Join-Path $hub 'tools\tests\custom-skill-wave.test.mjs') `
    (Join-Path $hub 'tools\tests\premium-domain-capsules.test.mjs') `
    (Join-Path $hub 'tools\tests\learning-mentor-router.test.mjs') `
    (Join-Path $hub 'tools\tests\learning-mentor-skill-contract.test.mjs') `
    (Join-Path $hub 'tools\tests\learning-material-registry.test.mjs') `
    (Join-Path $hub 'tools\tests\web-audit-report.test.mjs') `
    (Join-Path $hub 'tools\tests\web-audit-agent-contract.test.mjs') `
    (Join-Path $hub 'tools\tests\audit-browser-runtime.test.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Focused tests failed.' }

  if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) { throw 'Build completed without the expected ZIP.' }
  $sha256 = [Security.Cryptography.SHA256]::Create()
  try {
    $hashBytes = $sha256.ComputeHash([IO.File]::ReadAllBytes($archive))
    $hash = -join ($hashBytes | ForEach-Object { $_.ToString('X2') })
  } finally {
    $sha256.Dispose()
  }

  $versionedPackageBase = Join-Path $dist ("mansoor-agent-hub-" + $packageVersion)
  $versionedPackage = $versionedPackageBase
  if (Test-Path -LiteralPath $versionedPackage -PathType Container) {
    $versionedPackage = "$versionedPackageBase-$($buildId.Substring(0, 8))"
    Write-Host "EXISTING VERSIONED PACKAGE PRESERVED / writing this build to $versionedPackage" -ForegroundColor Yellow
  }
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
    if (Test-Path -LiteralPath $aliasBackup -PathType Container) {
      Write-Host "PREVIOUS DISTRIBUTION BACKUP PRESERVED / $aliasBackup" -ForegroundColor DarkGray
    }
    Write-Host "EXTRACTED PACKAGE REFRESHED / $extractedPackage" -ForegroundColor Green
  } catch {
    if (Test-Path -LiteralPath $aliasStage -PathType Container) { Remove-Item -LiteralPath $aliasStage -Recurse -Force -ErrorAction SilentlyContinue }
    if ((-not (Test-Path -LiteralPath $extractedPackage -PathType Container)) -and (Test-Path -LiteralPath $aliasBackup -PathType Container)) {
      Move-Item -LiteralPath $aliasBackup -Destination $extractedPackage -ErrorAction SilentlyContinue
    }
    Write-Host ("EXTRACTED PACKAGE REFRESH DEFERRED / " + $_.Exception.Message) -ForegroundColor Yellow
    Write-Host "Use the versioned package until the old installer window is closed: $versionedPackage" -ForegroundColor Yellow
  }

  foreach ($oldPackage in @(Get-ChildItem -LiteralPath $dist -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^mansoor-agent-hub-\d+\.\d+\.\d+(?:-[A-Fa-f0-9]+)?$' -and $_.FullName -ne $versionedPackage })) {
    Write-Host "OLD SIGNED BUILD PRESERVED / $($oldPackage.Name)" -ForegroundColor DarkGray
  }

  Write-Host ''
  Write-Host 'BUILD COMPLETE' -ForegroundColor Green
  Write-Host "Share this file: $archive"
  Write-Host "SHA256: $hash"

  function ConvertFrom-AgyPluginListJson([string]$Json) {
    if ([string]::IsNullOrWhiteSpace($Json) -or -not $Json.TrimStart().StartsWith('[')) { throw 'Antigravity plugin list is not a JSON array.' }
    Add-Type -AssemblyName System.Web.Extensions
    $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
    $serializer.MaxJsonLength = [int]::MaxValue
    $records = $serializer.DeserializeObject($Json)
    if ($records -isnot [System.Array]) { throw 'Antigravity plugin list did not deserialize to an array.' }
    foreach ($record in $records) {
      if ($record -isnot [System.Collections.IDictionary] -or [string]::IsNullOrWhiteSpace([string]$record['name'])) { throw 'Antigravity plugin list contains a malformed record.' }
    }
    return $records
  }

  $autoSyncAllowed = $true
  if (-not $SkipAutoInstall) {
    $agyPreflight = Get-Command agy -ErrorAction SilentlyContinue
    if (-not $agyPreflight) {
      $autoSyncAllowed = $false
      Write-Host 'AUTO UPDATE SKIPPED / Antigravity CLI (agy) is not available; package is ready and no global sync was started.' -ForegroundColor Yellow
    } else {
      $inventoryOutput = & $agyPreflight.Source plugin list --json 2>&1
      $inventoryExitCode = $LASTEXITCODE
      $inventory = $null
      $inventoryText = [string]($inventoryOutput -join "`n")
      $inventoryVerified = $false
      if ($inventoryExitCode -eq 0) {
        try {
          $inventory = @(ConvertFrom-AgyPluginListJson $inventoryText)
          $inventoryVerified = $true
        } catch { $inventory = $null; $inventoryVerified = $false }
      }
      if (-not $inventoryVerified) {
        $autoSyncAllowed = $false
        Write-Host 'AUTO UPDATE DEFERRED / native agy plugin inventory could not be verified; package is ready and no global or project sync was started.' -ForegroundColor Yellow
      } else {
        $targetManifest = Get-Content -LiteralPath (Join-Path $buildOutput 'plugin.json') -Raw | ConvertFrom-Json
        $targetVersion = [string]$targetManifest.version
        $installedHub = $inventory | Where-Object { $_['name'] -eq 'mansoor-agent-hub' } | Select-Object -First 1
        if ($installedHub -and ([string]::IsNullOrWhiteSpace([string]$installedHub['version']) -or [string]::IsNullOrWhiteSpace([string]$installedHub['path']) -or -not [IO.Path]::IsPathRooted([string]$installedHub['path']))) {
          $autoSyncAllowed = $false
          Write-Host 'AUTO UPDATE DEFERRED / native agy record has no trustworthy Mansoor version/path; package is ready and no global or project sync was started.' -ForegroundColor Yellow
        } else {
          $runningAntigravity = @(Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue)
          $needsPluginUpdate = (-not $installedHub) -or ([string]$installedHub['version'] -ne $targetVersion)
          if ($runningAntigravity.Count -gt 0 -and $needsPluginUpdate) {
            $autoSyncAllowed = $false
            $installedVersion = if ($installedHub) { [string]$installedHub['version'] } else { 'not-installed' }
            Write-Host ("AUTO UPDATE DEFERRED / Antigravity is running (" + $runningAntigravity.Count + " process(es)); native CLI reports version " + $installedVersion + " and target is " + $targetVersion + ". No global/project sync or plugin write was started. Close Antigravity normally and rerun the same package.") -ForegroundColor Yellow
          }
        }
      }
    }
  }

  if (-not $SkipAutoInstall -and $autoSyncAllowed) {
    Write-Host ''
    Write-Host 'GEMINI CLI / synchronizing Mansoor AI Team Manager, specialists, skills and policies...' -ForegroundColor Cyan
    & $node.Source (Join-Path $PSScriptRoot 'tools\install-gemini-cli-team.mjs') --verified-sync
    if ($LASTEXITCODE -ne 0) { throw "Gemini CLI team synchronization failed (exit $LASTEXITCODE)." }
  }

  if (-not $SkipAutoInstall -and $autoSyncAllowed) {
    $agyForUpdate = Get-Command agy -ErrorAction SilentlyContinue
    if (-not $agyForUpdate) {
      Write-Host 'AUTO UPDATE SKIPPED / Antigravity CLI (agy) is not available; the ZIP was built successfully.' -ForegroundColor Yellow
    } else {
      $inventoryJson = & $agyForUpdate.Source plugin list --json 2>$null
      $installedHub = $null
      try {
        $inventoryText = [string]($inventoryJson -join "`n")
        $inventory = @(ConvertFrom-AgyPluginListJson $inventoryText)
        $installedHub = $inventory | Where-Object { $_['name'] -eq 'mansoor-agent-hub' } | Select-Object -First 1
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
      if ($installedHub -and -not [string]::IsNullOrWhiteSpace([string]$installedHub['path'])) {
        $pluginConfigRoot = Split-Path -Parent (Split-Path -Parent ([string]$installedHub['path']))
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

      $pluginDetected = $installedHub -and -not [string]::IsNullOrWhiteSpace([string]$installedHub['path'])
      if (-not $pluginDetected -and -not $installedProfileRoot) {
        Write-Host 'AUTO UPDATE SKIPPED / no Mansoor plugin or installed agent-profile roots were detected; run the bundled installer once.' -ForegroundColor Yellow
      } else {
        Write-Host ''
        $targetSummary = if ($pluginDetected) { [string]$installedHub['path'] } else { $installedProfileRoot }
        $runningAntigravity = @(Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue)
        if ($runningAntigravity.Count -gt 0) {
          Write-Host "AUTO UPDATE / Antigravity is running ($($runningAntigravity.Count) process(es)); the native installer never stops it." -ForegroundColor Cyan
        }
        Write-Host "AUTO UPDATE / existing Mansoor installation detected at $targetSummary; applying this build..." -ForegroundColor Cyan
        $autoInstaller = Join-Path $buildOutput 'Install-Mansoor-Agent-Team.ps1'
        & (Join-Path $PSHOME 'powershell.exe') -NoProfile -ExecutionPolicy Bypass -File $autoInstaller
        $autoInstallExit = $LASTEXITCODE
        if ($autoInstallExit -eq 42) {
          Write-Host 'AUTO UPDATE DEFERRED / native installer preflight or Antigravity file-lock check deferred activation; ZIP remains ready and the active installation was preserved.' -ForegroundColor Yellow
        } elseif ($autoInstallExit -ne 0) {
          throw "Automatic Mansoor Agent Hub update failed (exit $autoInstallExit)."
        } else {
          Write-Host 'AUTO UPDATE COMPLETE / active plugin and profile roots were synchronized and hash-verified.' -ForegroundColor Green
        }
      }
    }
  } elseif ($SkipAutoInstall) {
    Write-Host 'AUTO UPDATE DISABLED / package-only build requested with -SkipAutoInstall. Run npm run build:auto (or npm run build) to synchronize an installed Antigravity profile after its normal host close/approval checks.' -ForegroundColor DarkGray
  }
} finally {
  if ($buildOutput -and (Test-Path -LiteralPath $buildOutput)) { Remove-Item -LiteralPath $buildOutput -Recurse -Force -ErrorAction SilentlyContinue }
  Set-Location -LiteralPath $previousLocation
}
