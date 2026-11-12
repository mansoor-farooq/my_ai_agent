param(
  [Parameter(Mandatory = $true)][string]$SourceRoot,
  [Parameter(Mandatory = $true)][string]$ConfigRoot
)

$ErrorActionPreference = 'Stop'
$sha256 = [System.Security.Cryptography.SHA256]::Create()
function Get-Sha256Hash([string]$Path) {
  $stream = [System.IO.File]::OpenRead($Path)
  try { return ([System.BitConverter]::ToString($sha256.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
  finally { $stream.Dispose() }
}
$sourcePath = (Resolve-Path -LiteralPath $SourceRoot).Path
$destinationRoot = Join-Path $ConfigRoot 'rules'
New-Item -ItemType Directory -Path $destinationRoot -Force | Out-Null
$statePath = Join-Path $destinationRoot '.mansoor-rule-state.json'
$state = @{ schemaVersion = 1; rules = @{} }
$malformedState = $false

if (Test-Path -LiteralPath $statePath -PathType Leaf) {
  try {
    $loaded = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    if ($loaded.schemaVersion -ne 1 -or $null -eq $loaded.rules) { throw 'Unsupported state schema.' }
    foreach ($property in $loaded.rules.PSObject.Properties) {
      if ([string]$property.Value -notmatch '^[a-fA-F0-9]{64}$') { throw 'Invalid managed hash.' }
      $state.rules[[string]$property.Name] = [string]$property.Value
    }
  } catch {
    $malformedState = $true
    Write-Host 'RULE STATE / malformed state preserved; customized files will not be overwritten' -ForegroundColor Yellow
  }
}

$report = @()
foreach ($source in @(Get-ChildItem -LiteralPath $sourcePath -File -Filter '*.md' | Sort-Object Name)) {
  $destination = Join-Path $destinationRoot $source.Name
  $sourceHash = Get-Sha256Hash $source.FullName
  if (-not (Test-Path -LiteralPath $destination -PathType Leaf)) {
    Copy-Item -LiteralPath $source.FullName -Destination $destination
    if (-not $malformedState) { $state.rules[$source.Name] = $sourceHash }
    Write-Host ("RULE UPDATED / {0} (new)" -f $destination) -ForegroundColor Green
    $report += [pscustomobject]@{ file = $source.Name; status = 'created'; packageHash = $sourceHash }
    continue
  }

  $currentHash = Get-Sha256Hash $destination
  $previousManagedHash = if ($malformedState) { '' } else { [string]$state.rules[$source.Name] }
  if ($currentHash -eq $sourceHash) {
    if (-not $malformedState) { $state.rules[$source.Name] = $sourceHash }
    Write-Host ("RULE CURRENT / {0}" -f $destination) -ForegroundColor DarkGray
    $report += [pscustomobject]@{ file = $source.Name; status = 'current'; packageHash = $sourceHash }
    continue
  }
  if ($previousManagedHash -and $currentHash -eq $previousManagedHash) {
    Copy-Item -LiteralPath $source.FullName -Destination $destination -Force
    $state.rules[$source.Name] = $sourceHash
    Write-Host ("RULE UPDATED / {0}" -f $destination) -ForegroundColor Green
    $report += [pscustomobject]@{ file = $source.Name; status = 'updated'; packageHash = $sourceHash }
    continue
  }

  Write-Host ("RULE PRESERVED / {0} (local customization detected; package hash {1}, local hash {2})" -f $destination, $sourceHash, $currentHash) -ForegroundColor Yellow
  $report += [pscustomobject]@{ file = $source.Name; status = 'preserved-local'; packageHash = $sourceHash; localHash = $currentHash }
}

if (-not $malformedState) {
  $stateTemp = "$statePath.$PID.tmp"
  $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $stateTemp -Encoding UTF8
  Move-Item -LiteralPath $stateTemp -Destination $statePath -Force
}

$report | ConvertTo-Json -Depth 5 -Compress
