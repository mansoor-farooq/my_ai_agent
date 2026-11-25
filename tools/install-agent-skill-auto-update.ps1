param(
    [switch]$Uninstall,
    [switch]$RunNow,
    [string]$DailyAt = '09:00'
)

$ErrorActionPreference = 'Stop'
$taskName = 'Mansoor AI Team Manager - Skill Auto Refresh'

if ($Uninstall) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Output "Removed scheduled task: $taskName"
    exit 0
}

if ($DailyAt -notmatch '^(?:[01]\d|2[0-3]):[0-5]\d$') {
    throw 'DailyAt must use 24-hour HH:mm format, for example 09:00.'
}

$root = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $PSScriptRoot 'run-agent-skill-auto-update.ps1'
$arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$runner`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments -WorkingDirectory $root
$userId = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$dailyTrigger = New-ScheduledTaskTrigger -Daily -At $DailyAt
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$trigger = @($dailyTrigger, $logonTrigger)
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Checks approved skill references and refreshes local Antigravity, Gemini CLI, and Codex skill installs.'
Register-ScheduledTask -TaskName $taskName -InputObject $task -Force | Out-Null
Write-Output "Installed '$taskName'. It checks approved references daily at $DailyAt local time and runs missed checks when the PC is available."

if ($RunNow) {
    Start-ScheduledTask -TaskName $taskName
    Write-Output 'Started an immediate refresh; see %LOCALAPPDATA%\MansoorAITeamManager\logs\skill-auto-update.log for the result.'
}
