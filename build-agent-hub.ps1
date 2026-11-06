param()

$ErrorActionPreference = 'Stop'
$hub = Split-Path -Parent $MyInvocation.MyCommand.Path
$previousLocation = Get-Location

try {
  Set-Location -LiteralPath $hub

  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) { throw 'Node.js is required. Install Node.js, then run the build again.' }

  $defaultKey = Join-Path $env:USERPROFILE '.mansoor-agent-keys\release-ed25519-private.pem'
  $keyPath = if ([string]::IsNullOrWhiteSpace($env:MANSOOR_AGENT_SIGNING_KEY)) { $defaultKey } else { [IO.Path]::GetFullPath($env:MANSOOR_AGENT_SIGNING_KEY) }

  if (Test-Path -LiteralPath $keyPath -PathType Leaf) {
    Write-Host 'Owner signing key found. Reusing the existing key.'
  } elseif ($keyPath -eq $defaultKey) {
    Write-Host 'Owner signing key not found. Creating it once...'
    & $node.Source (Join-Path $hub 'tools\create-owner-signing-key.mjs')
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $keyPath -PathType Leaf)) {
      throw 'Owner signing key creation failed.'
    }
  } else {
    throw "The custom signing key path does not exist: $keyPath"
  }

  Write-Host ''
  Write-Host 'Refreshing owner source checksums...'
  & $node.Source (Join-Path $hub 'tools\update-key-checksums.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Source checksum refresh failed.' }

  Write-Host ''
  Write-Host 'Step 1/3: Building and signing the portable ZIP...'
  & (Join-Path $hub 'install-antigravity-portable.ps1')

  Write-Host ''
  Write-Host 'Step 2/3: Running the agent-hub doctor...'
  & $node.Source (Join-Path $hub 'tools\agent-hub-doctor.mjs') --format json
  if ($LASTEXITCODE -ne 0) { throw 'Agent-hub doctor failed.' }

  Write-Host ''
  Write-Host 'Step 3/3: Running focused tests...'
  & $node.Source --test `
    (Join-Path $hub 'tools\tests\package-signing.test.mjs') `
    (Join-Path $hub 'tools\tests\agent-hub-doctor.test.mjs') `
    (Join-Path $hub 'tools\tests\backend-ml-router.test.mjs') `
    (Join-Path $hub 'tools\tests\portable-plugin-contents.test.mjs') `
    (Join-Path $hub 'tools\tests\native-agent-activity-contract.test.mjs') `
    (Join-Path $hub 'tools\tests\project-rag.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v2.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-state.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-mode.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-context.test.mjs') `
    (Join-Path $hub 'tools\tests\ultra-agent-v3-evaluation.test.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Focused tests failed.' }

  $archive = Join-Path $hub 'dist\mansoor-agent-hub.zip'
  if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) { throw 'Build completed without the expected ZIP.' }
  $sha256 = [Security.Cryptography.SHA256]::Create()
  try {
    $hashBytes = $sha256.ComputeHash([IO.File]::ReadAllBytes($archive))
    $hash = -join ($hashBytes | ForEach-Object { $_.ToString('X2') })
  } finally {
    $sha256.Dispose()
  }

  Write-Host ''
  Write-Host 'BUILD COMPLETE' -ForegroundColor Green
  Write-Host "Share this file: $archive"
  Write-Host "SHA256: $hash"
} finally {
  Set-Location -LiteralPath $previousLocation
}
