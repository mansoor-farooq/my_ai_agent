param(
  [string]$OutputDirectory,
  [string]$ArchivePath
)

$ErrorActionPreference = 'Stop'
$hub = Split-Path -Parent $MyInvocation.MyCommand.Path
$dist = Join-Path $hub 'dist'
New-Item -ItemType Directory -Path $dist -Force | Out-Null
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

if ([string]::IsNullOrWhiteSpace($ArchivePath)) {
  $ArchivePath = Join-Path $dist 'mansoor-agent-hub.zip'
}
$archive = [IO.Path]::GetFullPath($ArchivePath)
if (-not $archive.StartsWith($hubPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Archive path must stay inside the E:\Agents checkout: $archive"
}
New-Item -ItemType Directory -Path (Split-Path -Parent $archive) -Force | Out-Null
try {
  $agy = Get-Command agy -ErrorAction SilentlyContinue
  if ($agy) {
    & $agy.Source plugin validate --strict $output
    if ($LASTEXITCODE -ne 0) { throw 'Antigravity strict plugin validation failed.' }
    Write-Output 'Antigravity strict plugin validation passed.'
  } else {
    Write-Output 'Antigravity CLI not found here; strict validation can run on the target machine after extraction.'
  }
  Compress-Archive -Path (Join-Path $output '*') -DestinationPath $archive -Force
  Write-Output "Connector-free Gemini agent-team ZIP: $archive"
} finally {
  $resolvedOutput = [IO.Path]::GetFullPath($output)
  if ($resolvedOutput.StartsWith($hubPrefix, [StringComparison]::OrdinalIgnoreCase) -and
      (Split-Path -Leaf $resolvedOutput).StartsWith('build-staging-', [StringComparison]::OrdinalIgnoreCase) -and
      (Test-Path -LiteralPath $resolvedOutput)) {
    Remove-Item -LiteralPath $resolvedOutput -Recurse -Force
  }
}
Write-Output 'To install on a target system: agy plugin install <extracted-folder>'
