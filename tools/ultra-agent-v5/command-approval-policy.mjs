#!/usr/bin/env node

const READ_ONLY_PROBES = Object.freeze([
  {
    id: 'disk-space',
    pattern: /^(?:\$[A-Za-z_]\w*\s*=\s*)?\(\s*Get-CimInstance\s+Win32_LogicalDisk\s+-Filter\s+["']DeviceID\s*=\s*["']?([A-Za-z]):["']?["']\s*\)\.FreeSpace$/i,
  },
  {
    id: 'disk-space-direct',
    pattern: /^Get-CimInstance\s+Win32_LogicalDisk\s+-Filter\s+["']DeviceID\s*=\s*["']?([A-Za-z]):["']?["']$/i,
  },
  {
    id: 'version',
    pattern: /^(?:node|npm|flutter|dart|adb|scrcpy)\s+--version$/i,
  },
  {
    id: 'process-info',
    pattern: /^Get-Process(?:\s+-Id\s+\d+)?$/i,
  },
  {
    id: 'location-info',
    pattern: /^(?:Get-Date|Get-Location|Get-PSDrive(?:\s+-Name\s+[A-Za-z])?)$/i,
  },
]);

const ROUTINE_VERIFICATION_COMMANDS = Object.freeze([
  { id: 'npm-test', pattern: /^npm\s+test(?:\s+--\s+[\w./-]+)*$/i },
  { id: 'npm-lint', pattern: /^npm\s+run\s+(?:lint|typecheck|analyze|format:check)$/i },
  { id: 'flutter-analyze', pattern: /^flutter\s+analyze(?:\s+[\w./-]+)*$/i },
  { id: 'flutter-test', pattern: /^flutter\s+test(?:\s+[\w./-]+)*$/i },
  { id: 'dotnet-test', pattern: /^dotnet\s+test(?:\s+[\w./-]+)*$/i },
  { id: 'pytest', pattern: /^python(?:\.exe)?\s+-m\s+pytest(?:\s+[\w./-]+)*$/i },
]);

const CHAIN_OR_REDIRECT = /[;&|<>`]/;
const COMMAND_SUBSTITUTION = /\$\(|\$\{/;
const PROTECTED_PATH = /(?:^|[\\/\s"'=])(?:\.env(?:[.\w-]*)?|\.git(?:[\\/][^\s"']*)?|requirements(?:[\\/][^\s"']*)?|id_rsa(?:\.pub)?|id_ed25519(?:\.pub)?|[^\s"']+\.(?:pem|key|p12|pfx|keystore))(?=$|[\\/\s"'=])/i;
const DESTRUCTIVE_OR_MUTATING = /(?:Clear-RecycleBin|Remove-(?:Item|Child|Object)|Set-(?:Content|Item|ItemProperty)|New-(?:Item|Object)|Move-Item|Copy-Item|Rename-Item|Stop-Process|Start-Process|Invoke-Expression|Install-(?:Package|Module)|Uninstall-(?:Package|Module)|\b(?:delete|drop|truncate|purge|format|rmdir|del)\b|\bgit\s+(?:push|reset|clean)\b|\b(?:npm|pnpm|yarn|pip)\s+install\b)/i;
const NETWORK_COMMAND = /(?:Invoke-(?:WebRequest|RestMethod)|\b(?:curl|wget|ssh|scp|ftp)\b|(?:https?|ftp):\/\/|\s(?:-Uri|-Url|-Address|-Host)\s)/i;
const PATH_TRAVERSAL = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

function result(decision, commandClass, reason) {
  return Object.freeze({ decision, class: commandClass, reason });
}

/**
 * Classify a native shell command without executing it.
 *
 * Only exact read-only probes are manager-auto-approved. Everything else
 * remains owner-reviewed or denied, so this policy cannot broaden shell
 * access through a prompt or a model-generated command.
 */
export function classifyCommand({ command, workspacePaths = [] } = {}) {
  if (typeof command !== 'string' || !command.trim()) return result('deny', 'malformed', 'Shell command is missing or empty.');
  const normalized = command.trim().replace(/\r\n/g, '\n');
  if (normalized.length > 512) return result('owner_review', 'complex', 'Long shell commands require owner review.');
  if (CHAIN_OR_REDIRECT.test(normalized) || COMMAND_SUBSTITUTION.test(normalized)) {
    return result('owner_review', 'composed', 'Command chaining, redirection or substitution requires owner review.');
  }
  if (PATH_TRAVERSAL.test(normalized)) {
    return result('owner_review', 'path-traversal', 'Path traversal requires owner review.');
  }
  if (PROTECTED_PATH.test(normalized)) {
    return result('owner_review', 'protected-path', 'Protected files or directories require owner review.');
  }
  if (DESTRUCTIVE_OR_MUTATING.test(normalized)) {
    return result('owner_review', 'mutating', 'Mutating or destructive command requires owner review.');
  }
  if (NETWORK_COMMAND.test(normalized)) {
    return result('owner_review', 'network', 'Network-capable command requires owner review.');
  }
  const routine = ROUTINE_VERIFICATION_COMMANDS.find(({ pattern }) => pattern.test(normalized));
  if (routine) {
    return result('auto_approve', 'routine-verification', `Manager auto-approved deterministic ${routine.id} verification.`);
  }
  const probe = READ_ONLY_PROBES.find(({ pattern }) => pattern.test(normalized));
  if (probe) {
    return result('auto_approve', 'read-only-probe', `Manager auto-approved deterministic ${probe.id} probe.`);
  }
  void workspacePaths;
  return result('owner_review', 'unknown', 'Unclassified shell command requires owner review.');
}

export { READ_ONLY_PROBES, ROUTINE_VERIFICATION_COMMANDS };
