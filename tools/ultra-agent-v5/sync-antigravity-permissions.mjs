#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PERMISSION_POLICY_SCHEMA = 'mansoor.antigravity-permissions/v1';
export const PERMISSION_POLICY_VERSION = '2026-11-14.1';

// Keep these entries narrow. Antigravity evaluates deny before ask before allow;
// the installer must never add a blanket command(*) allow for the managed team.
export const SAFE_ALLOW_RULES = Object.freeze([
  'command(regex:^node --version$)',
  'command(regex:^npm --version$)',
  'command(regex:^flutter --version$)',
  'command(regex:^dart --version$)',
  'command(regex:^adb --version$)',
  'command(regex:^scrcpy --version$)',
  'command(regex:^npm test(?: -- [\\w./-]+)*)',
  'command(regex:^npm run (?:lint|typecheck|analyze|format:check)$)',
  'command(regex:^flutter (?:analyze|test)(?: [\\w./-]+)*)',
  'command(regex:^dotnet test(?: [\\w./-]+)*)',
  'command(regex:^python(?:\\.exe)? -m pytest(?: [\\w./-]+)*)',
  'mcp(runtime/*)',
  'mcp(mansoor-managed-runtime/*)',
]);

export const PROTECTED_DENY_RULES = Object.freeze([
  'command(regex:.*(?:Clear-RecycleBin|Remove-Item\\s+-Recurse|Remove-Item\\s+.*(?:\\.env|\\.git)|git\\s+(?:push|reset\\s+--hard|clean)|(?:format|diskpart|rmdir|del)\\b).*)',
  'command(regex:.*(?:Invoke-WebRequest|Invoke-RestMethod|curl|wget|ssh|scp|ftp)\\b.*)',
  'read_file(.env*)',
  'write_file(.env*)',
  'read_file(.git/)',
  'write_file(.git/)',
  'read_file(.ssh/)',
  'write_file(.ssh/)',
  'write_file(id_rsa*)',
  'write_file(id_ed25519*)',
]);

function list(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : [];
}

function mergeUnique(existing, additions) {
  const result = [];
  const seen = new Set();
  for (const item of [...list(existing), ...list(additions)]) {
    const key = item.trim();
    const normalized = key.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(key);
  }
  return result;
}

function policyMetadata() {
  return {
    schema: PERMISSION_POLICY_SCHEMA,
    version: PERMISSION_POLICY_VERSION,
    manager: 'Mansoor AI Team Manager',
    mode: 'auto-safe-review-critical',
    approvalScope: 'exact-project-session-manifest',
    denyPrecedence: true,
  };
}

/** Pure merge for the Antigravity CLI settings file. */
export function mergeCliSettings(input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const permissions = source.permissions && typeof source.permissions === 'object' && !Array.isArray(source.permissions)
    ? source.permissions
    : {};
  return {
    ...source,
    agentMode: source.agentMode || 'auto',
    permissions: {
      ...permissions,
      allow: mergeUnique(permissions.allow, SAFE_ALLOW_RULES),
      deny: mergeUnique(permissions.deny, PROTECTED_DENY_RULES),
      ask: list(permissions.ask),
    },
    mansoorPermissionPolicy: policyMetadata(),
  };
}

/** Pure merge for the Antigravity desktop config observed on Windows. */
export function mergeDesktopConfig(input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const userSettings = source.userSettings && typeof source.userSettings === 'object' && !Array.isArray(source.userSettings)
    ? source.userSettings
    : {};
  const grants = userSettings.globalPermissionGrants && typeof userSettings.globalPermissionGrants === 'object' && !Array.isArray(userSettings.globalPermissionGrants)
    ? userSettings.globalPermissionGrants
    : {};
  return {
    ...source,
    userSettings: {
      ...userSettings,
      globalPermissionGrants: {
        ...grants,
        allow: mergeUnique(grants.allow, SAFE_ALLOW_RULES),
        deny: mergeUnique(grants.deny, PROTECTED_DENY_RULES),
      },
      mansoorPermissionPolicy: policyMetadata(),
    },
  };
}

function parseJson(text, fallback = {}) {
  if (typeof text !== 'string' || !text.trim()) return fallback;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function atomicWrite(filePath, text) {
  const parent = path.dirname(filePath);
  fs.mkdirSync(parent, { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, text, 'utf8');
  fs.renameSync(temporary, filePath);
}

export function syncJsonFile(filePath, merge, { dryRun = false } = {}) {
  const existingText = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '{}\n';
  const existing = parseJson(existingText);
  const next = merge(existing);
  const nextText = `${JSON.stringify(next, null, 2)}\n`;
  const changed = existingText !== nextText;
  if (changed && !dryRun) {
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, `${filePath}.mansoor-backup`);
    atomicWrite(filePath, nextText);
  }
  return { filePath, changed, policy: next.mansoorPermissionPolicy || next.userSettings?.mansoorPermissionPolicy, settings: next };
}

export function syncAntigravityPermissions({ home = process.env.USERPROFILE || process.env.HOME, dryRun = false } = {}) {
  if (!home) throw new Error('user-home-required');
  const root = path.resolve(home);
  const cli = syncJsonFile(path.join(root, '.gemini', 'antigravity-cli', 'settings.json'), mergeCliSettings, { dryRun });
  const desktop = syncJsonFile(path.join(root, '.gemini', 'config', 'config.json'), mergeDesktopConfig, { dryRun });
  return { schema: PERMISSION_POLICY_SCHEMA, version: PERMISSION_POLICY_VERSION, changed: cli.changed || desktop.changed, files: [cli, desktop] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dryRun = process.argv.includes('--dry-run');
  const result = syncAntigravityPermissions({ dryRun });
  process.stdout.write(`${JSON.stringify({
    status: 'ok',
    dryRun,
    policy: { schema: PERMISSION_POLICY_SCHEMA, version: PERMISSION_POLICY_VERSION, mode: 'auto-safe-review-critical' },
    files: result.files.map((file) => ({ filePath: file.filePath, changed: file.changed })),
  })}\n`);
}
