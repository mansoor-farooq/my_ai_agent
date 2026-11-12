$ErrorActionPreference = 'Stop'

$pluginRoot = $env:PLUGIN_ROOT
if ([string]::IsNullOrWhiteSpace($pluginRoot)) { $pluginRoot = Split-Path -Parent $PSScriptRoot }
$pluginRoot = [IO.Path]::GetFullPath($pluginRoot)
$serverPath = Join-Path $pluginRoot 'tools\ultra-agent-v4\mcp-server.mjs'
if (-not (Test-Path -LiteralPath $serverPath -PathType Leaf)) {
  [Console]::Error.WriteLine('Mansoor managed MCP server file is missing from the installed plugin.')
  exit 1
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node -and $env:LOCALAPPDATA) {
  $runtimeRoot = Join-Path $env:LOCALAPPDATA 'Mansoor-Agent-Hub\runtime'
  if (Test-Path -LiteralPath $runtimeRoot -PathType Container) {
    $node = Get-ChildItem -LiteralPath $runtimeRoot -Filter node.exe -File -Recurse -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
  }
}
if (-not $node) {
  [Console]::Error.WriteLine('Node.js is unavailable. Run the Mansoor Agent Team installer, then restart Antigravity.')
  exit 1
}

if ([string]::IsNullOrWhiteSpace($env:MANSOOR_WORKSPACE_ROOT)) {
  if (-not [string]::IsNullOrWhiteSpace($env:PLUGIN_DATA)) {
    $env:MANSOOR_WORKSPACE_ROOT = Join-Path $env:PLUGIN_DATA 'workspaces'
  } elseif ($env:LOCALAPPDATA) {
    $env:MANSOOR_WORKSPACE_ROOT = Join-Path $env:LOCALAPPDATA 'Mansoor-Agent-Hub\workspaces'
  } else {
    [Console]::Error.WriteLine('Mansoor managed MCP could not find a local persistent data directory.')
    exit 1
  }
}

$nodeExecutable = if ($node.Source) { $node.Source } else { $node.FullName }
& $nodeExecutable $serverPath
exit $LASTEXITCODE
