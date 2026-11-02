param([switch]$Force)

$ErrorActionPreference = 'Stop'
$hub = Split-Path -Parent $MyInvocation.MyCommand.Path
$native = Join-Path $hub 'shared\native-profile'
$gemini = Join-Path $env:USERPROFILE '.gemini'
if (-not (Test-Path -LiteralPath $native)) { throw "Native profile missing: $native" }
$running = Get-Process -Name 'Antigravity','agy' -ErrorAction SilentlyContinue
if ($null -ne $running) { throw 'Antigravity is running. Close Antigravity and its CLI, then run this command again.' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $gemini (Join-Path 'agent-backups' "before-native-restore-$stamp")
New-Item -ItemType Directory -Path $backup -Force | Out-Null
function Move-Existing([string]$relative) {
  $source = Join-Path $gemini $relative
  if (-not (Test-Path -LiteralPath $source)) { return }
  $target = Join-Path $backup $relative
  New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
  Move-Item -LiteralPath $source -Destination $target
}
function Copy-Native([string]$relative, [string]$targetRelative = $relative) {
  $source = Join-Path $native $relative
  if (-not (Test-Path -LiteralPath $source)) { return }
  $target = Join-Path $gemini $targetRelative
  New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
  Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
}
Move-Existing 'antigravity\conversations'
Move-Existing 'antigravity\brain'
Move-Existing 'antigravity\conversation_summaries.db'
Move-Existing 'antigravity-ide\conversations'
Move-Existing 'antigravity-ide\brain'
Move-Existing 'config\projects'
Copy-Native 'app\conversations' 'antigravity\conversations'
Copy-Native 'app\brain' 'antigravity\brain'
Copy-Native 'app\conversation_summaries.db' 'antigravity\conversation_summaries.db'
Copy-Native 'ide\conversations' 'antigravity-ide\conversations'
Copy-Native 'ide\brain' 'antigravity-ide\brain'
Copy-Native 'projects' 'config\projects'
$manifest = Join-Path $native 'manifest.json'
if (Test-Path -LiteralPath $manifest) { Copy-Item -LiteralPath $manifest -Destination (Join-Path $backup 'native-profile-manifest.json') -Force }
Write-Output "Native Antigravity history restored. Previous profile backup: $backup"
Write-Output 'Start Antigravity and check the conversation sidebar. The readable archive remains under .gemini\agent-context.'
