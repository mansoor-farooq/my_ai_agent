[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [string]$RepositoryUrl = 'https://github.com/mansoor-farooq/my_ai_agent',
  [string]$Version
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Get-GitHubRepository([string]$Url) {
  try { $uri = [Uri]$Url } catch { throw 'RepositoryUrl must be a valid HTTPS GitHub URL.' }
  if ($uri.Scheme -ne 'https' -or $uri.Host -ne 'github.com') {
    throw 'Only HTTPS GitHub repository URLs are supported by the safe bootstrap installer.'
  }
  $parts = @($uri.AbsolutePath.Trim('/').Split('/') | Where-Object { $_ })
  if ($parts.Count -lt 2) { throw 'RepositoryUrl must look like https://github.com/owner/repository.' }
  [pscustomobject]@{
    Owner = $parts[0]
    Name = ($parts[1] -replace '\.git$', '')
  }
}

function Get-Sha256([string]$Path) {
  (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToUpperInvariant()
}

$repo = Get-GitHubRepository $RepositoryUrl
$releaseUri = if ([string]::IsNullOrWhiteSpace($Version)) {
  "https://api.github.com/repos/$($repo.Owner)/$($repo.Name)/releases/latest"
} else {
  "https://api.github.com/repos/$($repo.Owner)/$($repo.Name)/releases/tags/$Version"
}
$headers = @{
  Accept = 'application/vnd.github+json'
  'User-Agent' = 'Mansoor-Ultra-Agent-Bootstrap'
}

$installRoot = Join-Path $env:LOCALAPPDATA 'Mansoor-Agent-Hub\bootstrap'
$runRoot = Join-Path $installRoot ([guid]::NewGuid().ToString('N'))
$archive = Join-Path $runRoot 'mansoor-agent-hub.zip'
$checksum = Join-Path $runRoot 'mansoor-agent-hub.zip.sha256'
$extractRoot = Join-Path $runRoot 'package'
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null

try {
  Write-Host "Resolving signed Ultra Agent release from $($repo.Owner)/$($repo.Name)..." -ForegroundColor Cyan
  $release = Invoke-RestMethod -Uri $releaseUri -Headers $headers
  $zipAsset = @($release.assets | Where-Object { $_.name -eq 'mansoor-agent-hub.zip' } | Select-Object -First 1)
  if (-not $zipAsset) {
    throw 'No signed mansoor-agent-hub.zip release asset exists yet. Publish an approved signed release before using URL-only installation.'
  }
  $checksumAsset = @($release.assets | Where-Object { $_.name -eq 'mansoor-agent-hub.zip.sha256' } | Select-Object -First 1)

  Invoke-WebRequest -Uri $zipAsset.browser_download_url -Headers $headers -OutFile $archive
  if ($checksumAsset) {
    Invoke-WebRequest -Uri $checksumAsset.browser_download_url -Headers $headers -OutFile $checksum
    $match = Select-String -LiteralPath $checksum -Pattern '[0-9A-Fa-f]{64}' | Select-Object -First 1
    $expected = if ($match) { $match.Matches.Value.ToUpperInvariant() } else { $null }
    if ([string]::IsNullOrWhiteSpace($expected)) { throw 'Release checksum file does not contain a SHA-256 value.' }
    $actual = Get-Sha256 $archive
    if ($actual -ne $expected) { throw "Release checksum mismatch. Expected $expected, got $actual." }
    Write-Host 'Release checksum verified.' -ForegroundColor Green
  } else {
    Write-Host 'No detached checksum asset found; the package installer will still verify its signed manifest.' -ForegroundColor Yellow
  }

  Expand-Archive -LiteralPath $archive -DestinationPath $extractRoot -Force
  $installer = Get-ChildItem -LiteralPath $extractRoot -Filter 'Install-Mansoor-Agent-Team.cmd' -File -Recurse | Select-Object -First 1
  if (-not $installer) { throw 'The release package does not contain Install-Mansoor-Agent-Team.cmd.' }
  Write-Host "Starting the signed installer from release $($release.tag_name)..." -ForegroundColor Cyan
  $process = Start-Process -FilePath $env:ComSpec -ArgumentList @('/d', '/c', $installer.FullName) -Wait -PassThru
  if ($process.ExitCode -ne 0) { throw "Agent Team installer failed with exit code $($process.ExitCode)." }
  Write-Host 'Ultra Agent installation completed. Restart or reload Antigravity.' -ForegroundColor Green
} catch {
  Write-Host ('URL installer failed: ' + $_.Exception.Message) -ForegroundColor Red
  exit 1
} finally {
  $log = Get-ChildItem -LiteralPath $extractRoot -Filter 'Install-Mansoor-Agent-Team.log' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($log) {
    Copy-Item -LiteralPath $log.FullName -Destination (Join-Path $installRoot 'Install-Ultra-Agent.log') -Force -ErrorAction SilentlyContinue
  }
  Remove-Item -LiteralPath $runRoot -Recurse -Force -ErrorAction SilentlyContinue
}
