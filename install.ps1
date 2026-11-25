param(
  [string]$OutputDirectory,
  [string]$ArchivePath
)

$ErrorActionPreference = 'Stop'
$hub = Split-Path -Parent $MyInvocation.MyCommand.Path
$portableInstaller = Join-Path $hub 'install-antigravity-portable.ps1'
if (-not (Test-Path -LiteralPath $portableInstaller)) {
  throw "Portable agent-team builder is missing: $portableInstaller"
}

# This compatibility entry point only builds a local ZIP under the selected hub paths.
# It does not install into Antigravity, copy skills, restore history, or configure providers.
$arguments = @()
if (-not [string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $arguments += @('-OutputDirectory', $OutputDirectory)
}
if (-not [string]::IsNullOrWhiteSpace($ArchivePath)) {
  $arguments += @('-ArchivePath', $ArchivePath)
}
& $portableInstaller @arguments
