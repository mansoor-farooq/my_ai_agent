param(
  [string]$OutputDirectory,
  [string]$ArchivePath,
  [switch]$KeepOutput
)

$ErrorActionPreference = 'Stop'
$hub = Split-Path -Parent $MyInvocation.MyCommand.Path
$dist = Join-Path $hub 'dist'
New-Item -ItemType Directory -Path $dist -Force | Out-Null
$buildLockPath = Join-Path $dist '.mansoor-agent-hub-build.lock'
$buildLock = $null
try {
  $buildLock = [IO.FileStream]::new($buildLockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
  $metadata = [Text.Encoding]::UTF8.GetBytes((ConvertTo-Json @{ pid = $PID; startedAt = (Get-Date).ToUniversalTime().ToString('o') } -Compress))
  $buildLock.SetLength(0)
  $buildLock.Write($metadata, 0, $metadata.Length)
  $buildLock.Flush()
} catch {
  if ($buildLock) { $buildLock.Dispose() }
  throw 'Another Mansoor Agent Hub build is already running. Wait for it to finish, then run npm run build once.'
}

try {
$buildId = [guid]::NewGuid().ToString('N')
$output = if ([string]::IsNullOrWhiteSpace($OutputDirectory)) { Join-Path $dist ('build-staging-' + $buildId) } else { [IO.Path]::GetFullPath($OutputDirectory) }
$hubPrefix = [IO.Path]::GetFullPath($hub).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
if (-not $output.StartsWith($hubPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Build output must stay inside the E:\Agents checkout: $output"
}
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js is required to assemble the local agent-team plugin.' }
& $node.Source (Join-Path $hub 'tools\build-antigravity-plugin.mjs') $output
if ($LASTEXITCODE -ne 0) { throw 'Plugin packaging stopped. Review the diagnostic above.' }

$requiredSupportFiles = @(
  'mcp_config.json',
  'tools\ultra-agent-v4\mcp-server.mjs',
  'tools\start-managed-mcp.ps1',
  'skills\impeccable\agents\impeccable_asset_producer.toml',
  'skills\impeccable\agents\impeccable_documenter.toml',
  'skills\impeccable\agents\impeccable_finish_reviewer.toml',
  'skills\impeccable\agents\impeccable_manual_edit_applier.toml',
  'skills\impeccable\agents\openai.yaml',
  'skills\frontend-design\LICENSE',
  'skills\frontend-design\assets\vanilla-starter\index.html',
  'skills\frontend-design\assets\vanilla-starter\script.js',
  'skills\frontend-design\assets\vanilla-starter\style.css',
  'skills\frontend-design\references\aesthetic-playbook.md',
  'skills\frontend-design\references\implementation-patterns.md',
  'skills\project-context-orchestrator\agents\openai.yaml'
)
foreach ($relative in $requiredSupportFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path $output $relative) -PathType Leaf)) {
    throw "Required portable skill support file missing from build: $relative"
  }
}

if ([string]::IsNullOrWhiteSpace($ArchivePath)) {
  $ArchivePath = Join-Path $dist 'mansoor-agent-hub.zip'
}
$archive = [IO.Path]::GetFullPath($ArchivePath)
if (-not $archive.StartsWith($hubPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Archive path must stay inside the E:\Agents checkout: $archive"
}
New-Item -ItemType Directory -Path (Split-Path -Parent $archive) -Force | Out-Null
$archiveTemp = "$archive.$buildId.tmp.zip"
try {
  $agy = Get-Command agy -ErrorAction SilentlyContinue
  if ($agy) {
    & $agy.Source plugin validate --strict $output
    if ($LASTEXITCODE -ne 0) { throw 'Antigravity strict plugin validation failed.' }
    Write-Output 'Antigravity strict plugin validation passed.'
  } else {
    Write-Output 'Antigravity CLI not found here; strict validation can run on the target machine after extraction.'
  }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (Test-Path -LiteralPath $archiveTemp) {
    Remove-Item -LiteralPath $archiveTemp -Force
  }
  [IO.Compression.ZipFile]::CreateFromDirectory(
    $output,
    $archiveTemp,
    [IO.Compression.CompressionLevel]::Optimal,
    $false
  )
  if (-not (Test-Path -LiteralPath $archiveTemp -PathType Leaf) -or (Get-Item -LiteralPath $archiveTemp).Length -le 0) {
    throw 'ZIP creation produced an empty archive.'
  }
  Move-Item -LiteralPath $archiveTemp -Destination $archive -Force
  Write-Output "Self-contained Mansoor Agent Hub ZIP: $archive"
} finally {
  $resolvedOutput = [IO.Path]::GetFullPath($output)
  if (-not $KeepOutput -and $resolvedOutput.StartsWith($hubPrefix, [StringComparison]::OrdinalIgnoreCase) -and
      (Split-Path -Leaf $resolvedOutput).StartsWith('build-staging-', [StringComparison]::OrdinalIgnoreCase) -and
      (Test-Path -LiteralPath $resolvedOutput)) {
    Remove-Item -LiteralPath $resolvedOutput -Recurse -Force
  }
}
Write-Output 'Target setup: install Antigravity, extract the ZIP, then double-click Install-Mansoor-Agent-Team.cmd.'
} finally {
  if ($archiveTemp -and (Test-Path -LiteralPath $archiveTemp)) { Remove-Item -LiteralPath $archiveTemp -Force -ErrorAction SilentlyContinue }
  if ($buildLock) { $buildLock.Dispose() }
  if (Test-Path -LiteralPath $buildLockPath) { Remove-Item -LiteralPath $buildLockPath -Force -ErrorAction SilentlyContinue }
}
