param(
  [ValidateSet('Antigravity', 'Folder')]
  [string]$Agent = 'Antigravity',
  [string]$TargetDir,
  [switch]$RestoreNativeHistory
)

$ErrorActionPreference = 'Stop'
$hub = Split-Path -Parent $MyInvocation.MyCommand.Path
$bundle = Join-Path $hub 'agents\Antigravity\antigravity-portable-setup.zip'
$contextZip = Join-Path $hub 'shared\knowledge\readable-chat-context.zip'
$datasets = Join-Path $hub 'shared\knowledge\datasets'
if (-not (Test-Path -LiteralPath $bundle)) { throw "Missing agent bundle: $bundle" }
if (-not (Test-Path -LiteralPath $contextZip)) { throw "Missing shared context: $contextZip" }
if (-not (Test-Path -LiteralPath $datasets)) { throw "Missing project flow datasets: $datasets" }

function Install-Datasets([string]$ContextDir) {
  $destination = Join-Path $ContextDir 'datasets'
  New-Item -ItemType Directory -Path $destination -Force | Out-Null
  foreach ($item in Get-ChildItem -LiteralPath $datasets -Force) {
    $targetItem = Join-Path $destination $item.Name
    if (Test-Path -LiteralPath $targetItem) { continue }
    Copy-Item -LiteralPath $item.FullName -Destination $targetItem -Recurse
  }
}

$scratch = Join-Path ([IO.Path]::GetTempPath()) ('agents-hub-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $scratch | Out-Null
try {
  Expand-Archive -LiteralPath $bundle -DestinationPath $scratch

  if ($Agent -eq 'Antigravity') {
    & (Join-Path $scratch 'install-windows.ps1') -InstallGlobalInstructions
    & (Join-Path $scratch 'install-chat-context.ps1')
    Install-Datasets (Join-Path $env:USERPROFILE '.gemini\agent-context')

    $customAgents = Join-Path $hub 'agents\Antigravity\custom-agents'
    $agentDestination = Join-Path $env:USERPROFILE '.gemini\config\agents'
    New-Item -ItemType Directory -Path $agentDestination -Force | Out-Null
    $installedAgents = 0
    foreach ($definition in Get-ChildItem -LiteralPath $customAgents -Directory) {
      $targetAgent = Join-Path $agentDestination $definition.Name
      if (Test-Path -LiteralPath $targetAgent) {
        Write-Output "SKIP existing custom agent: $($definition.Name)"
        continue
      }
      Copy-Item -LiteralPath $definition.FullName -Destination $targetAgent -Recurse
      $installedAgents++
    }

    $sourceSkills = Join-Path $hub 'skills'
    $skillDestination = Join-Path $env:USERPROFILE '.gemini\config\skills'
    New-Item -ItemType Directory -Path $skillDestination -Force | Out-Null
    $installedSkills = 0
    if (Test-Path -LiteralPath $sourceSkills) {
      foreach ($skill in Get-ChildItem -LiteralPath $sourceSkills -Directory) {
        $targetSkill = Join-Path $skillDestination $skill.Name
        if (-not (Test-Path -LiteralPath $targetSkill)) {
          Copy-Item -LiteralPath $skill.FullName -Destination $targetSkill -Recurse
          $installedSkills++
        }
      }
    }

    if ($RestoreNativeHistory) { & (Join-Path $hub 'restore-native-history.ps1') }

    $instructions = Join-Path $env:USERPROFILE '.gemini\GEMINI.md'
    $marker = '<!-- agents-hub-context -->'
    $contextNote = @"

$marker
For existing projects, read %USERPROFILE%\.gemini\agent-context\datasets\WORKSTYLE.md and PROJECT_FLOWS.md, then the relevant summary in codex-memory. Search codex-conversation-index.json and conversation-index.json in that context folder for matching chats. Read their transcripts when needed. Treat old chats as history and verify current files before editing.
"@
    if (Test-Path -LiteralPath $instructions) {
      $current = Get-Content -LiteralPath $instructions -Raw
      if (-not $current.Contains($marker)) {
        Add-Content -LiteralPath $instructions -Value $contextNote
      }
    } else {
      New-Item -ItemType Directory -Path (Split-Path -Parent $instructions) -Force | Out-Null
      Set-Content -LiteralPath $instructions -Value $contextNote.TrimStart() -Encoding utf8
    }
    Write-Output "Antigravity skills, chat context, and $installedAgents new custom agents installed. Restart Antigravity."
  } else {
    if ([string]::IsNullOrWhiteSpace($TargetDir)) { throw '-TargetDir is required for -Agent Folder.' }
    $target = [IO.Path]::GetFullPath($TargetDir)
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    $knowledge = Join-Path $target 'agent-context'
    if (Test-Path -LiteralPath $knowledge) {
      Write-Output "SKIP existing context: $knowledge"
    } else {
      Expand-Archive -LiteralPath $contextZip -DestinationPath $knowledge
      Write-Output "Installed shared chat context: $knowledge"
    }
    Install-Datasets $knowledge
    $skills = Join-Path $target 'skills'
    if (Test-Path -LiteralPath $skills) {
      Write-Output "SKIP existing skills: $skills"
    } else {
      Copy-Item -LiteralPath (Join-Path $scratch 'global-skills') -Destination $skills -Recurse
      Write-Output "Copied skill references: $skills"
    }
    $pluginReferences = Join-Path $target 'plugin-skill-reference'
    if (Test-Path -LiteralPath $pluginReferences) {
      Write-Output "SKIP existing plugin references: $pluginReferences"
    } else {
      Copy-Item -LiteralPath (Join-Path $scratch 'codex-plugin-reference') -Destination $pluginReferences -Recurse
      Write-Output "Copied plugin skill references: $pluginReferences"
    }
    $handoff = Join-Path $target 'AGENT_HANDOFF.md'
    if (-not (Test-Path -LiteralPath $handoff)) {
      Copy-Item -LiteralPath (Join-Path $hub 'shared\AGENT_HANDOFF.md') -Destination $handoff
    }
    Write-Output "Folder handoff ready: $target"
  }
} finally {
  $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  $resolvedScratch = [IO.Path]::GetFullPath($scratch)
  if ($resolvedScratch.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and
      (Split-Path -Leaf $resolvedScratch).StartsWith('agents-hub-', [StringComparison]::OrdinalIgnoreCase) -and
      (Test-Path -LiteralPath $resolvedScratch)) {
    Remove-Item -LiteralPath $resolvedScratch -Recurse -Force
  }
}
