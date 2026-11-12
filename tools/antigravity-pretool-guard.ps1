$ErrorActionPreference = 'Stop'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node -and $env:LOCALAPPDATA) {
  $runtimeRoot = Join-Path $env:LOCALAPPDATA 'Mansoor-Agent-Hub\runtime'
  if (Test-Path -LiteralPath $runtimeRoot -PathType Container) {
    $node = Get-ChildItem -LiteralPath $runtimeRoot -Filter node.exe -File -Recurse -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
  }
}
if (-not $node) {
  [Console]::Out.WriteLine('{"decision":"deny","reason":"Node runtime unavailable; native action blocked by default."}')
  exit 0
}
$guard = Join-Path $PSScriptRoot 'antigravity-pretool-guard.mjs'
$inputText = [Console]::In.ReadToEnd()
$nodeExecutable = if ($node.Source) { $node.Source } else { $node.FullName }
$output = $inputText | & $nodeExecutable $guard 2>$null
if ($LASTEXITCODE -ne 0) {
  [Console]::Out.WriteLine('{"decision":"deny","reason":"Pre-tool guard failed; native action blocked by default."}')
  exit 0
}
[Console]::Out.WriteLine(($output -join "`n"))
