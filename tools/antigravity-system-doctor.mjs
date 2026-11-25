#!/usr/bin/env node
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const SCHEMA = 'mansoor.antigravity-system-doctor/v1';
const DEFAULT_TIMEOUT_MS = 5_000;

function safeVersion(text) {
  const cleaned = String(text || '').replaceAll('\0', '').trim();
  const match = cleaned.match(/v?\d+\.\d+(?:\.\d+)?(?:[-+][^\s]+)?/);
  return match ? match[0] : cleaned.split(/\r?\n/)[0].slice(0, 120);
}

export function resolveCommand(name, platform = process.platform) {
  let resolved = null;
  try {
    const resolver = platform === 'win32' ? 'where.exe' : 'which';
    const candidates = execFileSync(resolver, [name], { encoding: 'utf8', windowsHide: true, timeout: 1_000, stdio: ['ignore', 'pipe', 'ignore'] }).split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
    resolved = candidates.find((entry) => /\.(?:exe|cmd|bat)$/i.test(entry)) || candidates[0] || null;
  } catch {}
  if (resolved || platform !== 'win32') return resolved;
  const appData = process.env.APPDATA || '';
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const candidates = {
    agy: [path.join(localAppData, 'agy', 'bin', 'agy.exe')],
    gemini: [path.join(appData, 'npm', 'gemini.cmd')],
    npm: [path.join(programFiles, 'nodejs', 'npm.cmd')],
    node: [path.join(programFiles, 'nodejs', 'node.exe')],
    git: [path.join(programFiles, 'Git', 'cmd', 'git.exe')],
    psql: [path.join(programFiles, 'PostgreSQL', '17', 'bin', 'psql.exe')],
    wsl: [path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'wsl.exe')],
    tasklist: [path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'tasklist.exe')],
  }[name] || [];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

export function runCommand(command, args = [], timeout = DEFAULT_TIMEOUT_MS) {
  if (!command) return { ok: false, exitCode: null, output: '', error: 'command-not-found' };
  try {
    const isWindowsShim = process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(command);
    const executable = isWindowsShim ? (process.env.ComSpec || 'cmd.exe') : command;
    const invocationArgs = isWindowsShim ? ['/d', '/c', command, ...args] : args;
    const output = execFileSync(executable, invocationArgs, { encoding: 'utf8', windowsHide: true, timeout, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
    return { ok: true, exitCode: 0, output: String(output || '').trim(), error: null };
  } catch (error) {
    return { ok: false, exitCode: Number.isInteger(error?.status) ? error.status : null, output: String(error?.stdout || '').trim(), error: error?.code || 'command-failed' };
  }
}

function record(id, status, summary, details = {}) {
  return { id, status, summary, ...details };
}

function parsePluginInventory(output) {
  const text = String(output || '').trim();
  const start = text.indexOf('[');
  if (start < 0) return null;
  try {
    const parsed = JSON.parse(text.slice(start));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function processCount(output) {
  const lines = String(output || '').split(/\r?\n/).filter(Boolean);
  return lines.filter((line) => /Antigravity(?:\.exe)?/i.test(line)).length;
}

export function resolveSystemSettingsPath({ platform = process.platform, env = process.env } = {}) {
  if (env.GEMINI_CLI_SYSTEM_SETTINGS_PATH) return path.resolve(String(env.GEMINI_CLI_SYSTEM_SETTINGS_PATH));
  if (platform === 'win32') return path.join(env.ProgramData || 'C:\\ProgramData', 'gemini-cli', 'settings.json');
  if (platform === 'darwin') return '/Library/Application Support/GeminiCli/settings.json';
  return '/etc/gemini-cli/settings.json';
}

export function collectSystemDoctor({
  platform = process.platform,
  env = process.env,
  resolver = (name) => resolveCommand(name, platform),
  runner = runCommand,
  fileSystem = fs,
  now = () => Date.now(),
} = {}) {
  const startedAt = now();
  const checks = [];
  const commands = {};
  for (const name of ['agy', 'gemini', 'node', 'npm', 'git', 'psql', 'wsl']) commands[name] = resolver(name);

  const nodeProbe = runner(commands.node, ['--version']);
  const nodeMajor = Number(String(nodeProbe.output).match(/v(\d+)/)?.[1] || 0);
  checks.push(nodeProbe.ok && nodeMajor >= 20
    ? record('node-runtime', 'pass', `Node.js ${safeVersion(nodeProbe.output)} is supported.`, { version: safeVersion(nodeProbe.output) })
    : record('node-runtime', commands.node ? 'fail' : 'warn', commands.node ? `Node.js ${safeVersion(nodeProbe.output) || 'version unavailable'} is below the supported Node 20+ baseline or failed to run.` : 'Node.js is not on PATH.', { remediation: 'Install Node.js 20+ and reopen the terminal/Antigravity so PATH is refreshed.' }));

  for (const name of ['agy', 'gemini', 'npm', 'git']) {
    const probe = runner(commands[name], ['--version']);
    checks.push(probe.ok
      ? record(`${name}-cli`, 'pass', `${name} ${safeVersion(probe.output)} is available.`, { version: safeVersion(probe.output) })
      : record(`${name}-cli`, 'warn', `${name} CLI is not available to this process.`, { remediation: `Install or expose ${name} on PATH, then restart the host.` }));
  }

  let inventory = null;
  if (commands.agy) {
    const pluginProbe = runner(commands.agy, ['plugin', 'list', '--json'], 10_000);
    inventory = pluginProbe.ok ? parsePluginInventory(pluginProbe.output) : null;
    if (inventory) {
      const mansoor = inventory.find((item) => item?.name === 'mansoor-agent-hub');
      checks.push(mansoor
        ? record('antigravity-plugin', 'pass', `Mansoor Agent Hub ${mansoor.version || 'unknown'} is registered.`, { version: mansoor.version || null, path: typeof mansoor.path === 'string' ? mansoor.path : null, enabled: mansoor.enabled !== false })
        : record('antigravity-plugin', 'warn', 'Native agy inventory is valid, but Mansoor Agent Hub is not registered.', { remediation: 'Run the signed package installer once, then restart Antigravity.' }));
    } else {
      checks.push(record('antigravity-plugin', 'fail', 'The native agy plugin inventory could not be verified.', { remediation: 'Do not overwrite a running host; close Antigravity normally and rerun the signed package.' }));
    }
  } else {
    checks.push(record('antigravity-plugin', 'warn', 'agy CLI is unavailable; plugin state cannot be verified.', { remediation: 'Install/enable the genuine Antigravity CLI before syncing.' }));
  }

  if (platform === 'win32' && commands.wsl) {
    const wslProbe = runner(commands.wsl, ['--status']);
    checks.push(wslProbe.ok
      ? record('wsl-runtime', 'pass', 'WSL is available; Windows fallback remains supported.', { version: safeVersion(wslProbe.output) || null })
      : record('wsl-runtime', 'warn', 'WSL is installed but did not answer its status probe.', { remediation: 'Use the Windows adapter unless a required task explicitly needs WSL.' }));
  }

  if (commands.psql) {
    const psqlProbe = runner(commands.psql, ['--version']);
    checks.push(psqlProbe.ok
      ? record('postgres-client', 'pass', `PostgreSQL client ${safeVersion(psqlProbe.output)} is available; RAG remains opt-in.`, { version: safeVersion(psqlProbe.output) })
      : record('postgres-client', 'warn', 'PostgreSQL client is present on PATH but did not answer its version probe.', { remediation: 'Use the Antigravity-native context path or repair the local PostgreSQL client before opting into RAG.' }));
  } else {
    checks.push(record('postgres-client', 'skip', 'PostgreSQL client is not installed; this is allowed because RAG is optional.', { remediation: 'Install PostgreSQL only for an explicit durable-RAG requirement.' }));
  }

  const tasklist = platform === 'win32' ? runner(resolver('tasklist'), ['/FI', 'IMAGENAME eq Antigravity.exe', '/FO', 'CSV', '/NH']) : { ok: false, output: '' };
  const antigravityProcesses = platform === 'win32' ? processCount(tasklist.output) : null;
  if (antigravityProcesses > 0) checks.push(record('host-processes', 'warn', `Antigravity has ${antigravityProcesses} active process record(s).`, { remediation: 'A plugin upgrade will defer safely until Antigravity is closed; never kill it from the installer.' }));

  const ciVariables = Object.keys(env).filter((key) => /^CI(?:_|$)/i.test(key));
  if (ciVariables.length) checks.push(record('interactive-environment', 'warn', 'CI environment variables are present and may make Gemini CLI non-interactive.', { variables: ciVariables.slice(0, 12), remediation: 'Run interactive setup outside CI, or explicitly configure the non-interactive authentication path.' }));
  if (env.GOOGLE_CLOUD_PROJECT || env.GOOGLE_CLOUD_PROJECT_ID) checks.push(record('cloud-project-selection', 'warn', 'A Google Cloud project environment variable is set and can change subscription selection.', { remediation: 'Confirm the intended project before authenticating; the doctor does not change it.' }));
  if (env.NODE_EXTRA_CA_CERTS || env.NODE_USE_SYSTEM_CA) checks.push(record('tls-configuration', 'pass', 'Custom/system CA configuration is visible without exposing its value.', { variables: ['NODE_EXTRA_CA_CERTS', 'NODE_USE_SYSTEM_CA'].filter((key) => env[key]) }));

  // Google documents system settings as the highest-precedence Gemini CLI
  // layer. Do not edit it from the installer; surface it so permission and
  // hook overrides are explainable instead of looking like random host drift.
  const systemSettingsPath = resolveSystemSettingsPath({ platform, env });
  if (fileSystem.existsSync(systemSettingsPath)) {
    let settings = null;
    try { settings = JSON.parse(fileSystem.readFileSync(systemSettingsPath, 'utf8')); } catch { /* report malformed below */ }
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      checks.push(record('gemini-system-settings', 'warn', 'The highest-precedence Gemini CLI system settings file exists but is not valid JSON.', { path: systemSettingsPath, remediation: 'Repair or intentionally remove the system settings file, then rerun the doctor. The installer does not overwrite it.' }));
    } else {
      const overrideKeys = ['hooks', 'permissions', 'tools', 'agents', 'mcpServers'].filter((key) => Object.hasOwn(settings, key));
      checks.push(record('gemini-system-settings', 'warn', 'A highest-precedence Gemini CLI system settings file can override user/project hooks, permissions or agent settings.', { path: systemSettingsPath, overrideKeys, remediation: 'Review this file before changing the Mansoor profile; the installer preserves it and does not silently override system policy.' }));
    }
  }

  const failCount = checks.filter((item) => item.status === 'fail').length;
  const warnCount = checks.filter((item) => item.status === 'warn').length;
  return {
    schema: SCHEMA,
    generatedAt: new Date().toISOString(),
    host: { platform, arch: process.arch, node: process.version, hostname: os.hostname() },
    status: failCount ? 'blocked' : warnCount ? 'attention' : 'ready',
    summary: { checks: checks.length, failures: failCount, warnings: warnCount, durationMs: Math.max(0, now() - startedAt) },
    checks,
    inventory: inventory ? { count: inventory.length, thirdPartyCount: inventory.filter((item) => item?.name !== 'mansoor-agent-hub').length } : null,
    policy: { readOnly: true, doesNotKillHost: true, doesNotChangeProviders: true, doesNotPrintSecrets: true, nextAction: failCount ? 'Resolve the failed check, then rerun this doctor once.' : 'Use the native Antigravity panel; do not repeat a full repository read when the context cache is current.' },
  };
}

function cli() {
  const json = process.argv.includes('--json');
  const result = collectSystemDoctor();
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`Antigravity System Doctor: ${result.status}`);
    for (const check of result.checks) console.log(`[${check.status.toUpperCase()}] ${check.summary}`);
    console.log(`Checks: ${result.summary.checks}; failures: ${result.summary.failures}; warnings: ${result.summary.warnings}`);
    console.log(`Next: ${result.policy.nextAction}`);
  }
  process.exitCode = result.status === 'blocked' ? 2 : 0;
}

if (process.argv[1] && process.argv[1].endsWith('antigravity-system-doctor.mjs')) cli();
