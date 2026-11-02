# DeepSeek Hermes & Subagent Bridge Installer
param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$subagentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceProfile = Join-Path $subagentDir 'dsh-profile'
$targetProfile = Join-Path $env:USERPROFILE '.dsh'

Write-Output "[Hermes Bridge] Installing DeepSeek Hermes configuration and credentials..."

if (-not (Test-Path -LiteralPath $sourceProfile)) {
  throw "Missing source profile: $sourceProfile"
}

New-Item -ItemType Directory -Path $targetProfile -Force | Out-Null

# Copy credentials and profile configurations
Copy-Item -Path (Join-Path $sourceProfile '*') -Destination $targetProfile -Recurse -Force

Write-Output "[Hermes Bridge] Installed credentials to: $targetProfile"
Write-Output "[Hermes Bridge] DeepSeek free account token & 4-Key Gemini Pool ready for autonomous subagents."
