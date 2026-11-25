#!/usr/bin/env node
import os from 'node:os';

export function selectCommandShell({ platform = process.platform, wsl = {}, distro = null } = {}) {
  if (platform === 'win32' && wsl?.available && (distro || wsl.defaultDistro)) {
    const selectedDistro = distro || wsl.defaultDistro;
    return { kind: 'wsl', executable: 'wsl.exe', argsPrefix: ['-d', selectedDistro, '--', 'bash', '-lc'], distro: selectedDistro };
  }
  if (platform === 'win32') return { kind: 'windows', executable: 'pwsh.exe', argsPrefix: ['-NoProfile', '-NonInteractive', '-Command'], distro: null };
  return { kind: 'posix', executable: '/bin/bash', argsPrefix: ['-lc'], distro: null };
}

export function normalizeCommandForShell(command, shell) {
  const value = String(command || '').trim();
  if (!value) throw new Error('command-required');
  if (shell?.kind === 'windows' && /^(?:bash|bash\.exe)\b/i.test(value)) {
    throw new Error('bare-bash-on-windows-use-powershell-or-explicit-wsl');
  }
  if (shell?.kind === 'wsl' && /^powershell(?:\.exe)?\b/i.test(value)) {
    throw new Error('powershell-command-cannot-run-in-wsl-shell');
  }
  return value;
}

export function resolveCommandRuntime({ platform = process.platform, wsl = {}, distro = null, release = os.release() } = {}) {
  const shell = selectCommandShell({ platform, wsl, distro });
  return { schema: 'mansoor.cross-platform-command-runtime/v1', platform, release, shell, fallback: shell.kind === 'windows' && !wsl?.available ? 'native-windows' : null };
}

if (process.argv[1] && process.argv[1].endsWith('cross-platform-command.mjs')) {
  process.stdout.write(`${JSON.stringify(resolveCommandRuntime())}\n`);
}
