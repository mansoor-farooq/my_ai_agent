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
  [Console]::Error.WriteLine('Node runtime unavailable; native action blocked by default.')
  exit 2
}
$guard = Join-Path $PSScriptRoot 'antigravity-pretool-guard.mjs'
$inputText = [Console]::In.ReadToEnd()
$nodeExecutable = if ($node.Source) { $node.Source } else { $node.FullName }
$output = $inputText | & $nodeExecutable $guard 2>$null
if ($LASTEXITCODE -ne 0) {
  [Console]::Out.WriteLine('{"decision":"deny","reason":"Pre-tool guard failed; native action blocked by default."}')
  [Console]::Error.WriteLine('Pre-tool guard failed; native action blocked by default.')
  exit 2
}
$serialized = ($output -join "`n").Trim()
if ([string]::IsNullOrWhiteSpace($serialized)) {
  [Console]::Out.WriteLine('{"decision":"deny","reason":"Pre-tool guard returned no decision; native action blocked by default."}')
  [Console]::Error.WriteLine('Pre-tool guard returned no decision; native action blocked by default.')
  exit 2
}
[Console]::Out.WriteLine($serialized)
try {
  $decision = $serialized | ConvertFrom-Json
  if ([string]$decision.decision -eq 'deny') {
    # Google documents exit 0 + {decision:"deny"} as the preferred
    # intentional-block path. Exit 2 is reserved for hook/script failures.
    exit 0
  }
  if ([string]$decision.decision -ne 'allow') {
    [Console]::Error.WriteLine('Pre-tool guard returned an unknown decision; native action blocked by default.')
    exit 2
  }
} catch {
  [Console]::Error.WriteLine('Pre-tool guard returned malformed JSON; native action blocked by default.')
  exit 2
}
exit 0
