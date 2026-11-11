param(
  [Parameter(Mandatory=$true)][string]$Project,
  [string]$Out
)
$ErrorActionPreference = 'Stop'
$arguments = @('tools/flutter-release-gate.mjs', '--project', $Project)
if ($Out) { $arguments += @('--out', $Out) }
& node @arguments
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
