#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MANAGER_SCRIPT_REGISTRY_SCHEMA = 'mansoor.manager-script-registry/v1';

const SCRIPT_PATH = /\.(?:js|mjs|cjs|ps1)$/i;
const DESTRUCTIVE_SCRIPT = /(?:\b(?:clear-recyclebin|remove-(?:item|child|object)|diskpart)\b|\b(?:delete|destroy|drop|truncate|purge|rmdir|del|erase|format)\b|\bgit\s+clean\b)/i;
const NETWORK_SCRIPT = /(?:Invoke-(?:WebRequest|RestMethod)|\b(?:curl|wget|ssh|scp|ftp)\b|\b(?:https?|ftp):\/\/)/i;

function defaultRegistryPath() {
  const home = process.env.USERPROFILE || process.env.HOME || os.homedir();
  return path.join(home, '.gemini', 'antigravity-cli', 'mansoor-manager-scripts.json');
}

function sha256(text) {
  return `sha256:${crypto.createHash('sha256').update(text).digest('hex')}`;
}

function canonicalExisting(filePath, kind) {
  if (typeof filePath !== 'string' || !filePath.trim() || filePath.includes('\0')) throw new Error(`${kind}-path-required`);
  const absolute = path.resolve(filePath);
  if (!fs.existsSync(absolute)) throw new Error(`${kind}-not-found`);
  const real = fs.realpathSync.native(absolute);
  const stat = fs.statSync(real);
  if (kind === 'script' && !stat.isFile()) throw new Error('script-file-required');
  if (kind === 'project' && !stat.isDirectory()) throw new Error('project-directory-required');
  return real;
}

function samePath(left, right) {
  return path.normalize(left).toLowerCase() === path.normalize(right).toLowerCase();
}

function unquote(value) {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1);
  return trimmed;
}

/** Parse only script-file execution; inline -e/-Command is intentionally excluded. */
export function parseManagerScriptCommand(command) {
  if (typeof command !== 'string' || !command.trim()) return null;
  const source = command.trim();
  const node = source.match(/^\s*(node|node\.exe)\s+(?:--[^\s]+\s+)*("[^"]+"|'[^']+'|[^\s]+)\s*$/i);
  if (node) {
    const scriptPath = unquote(node[2]);
    if (SCRIPT_PATH.test(scriptPath)) return { interpreter: 'node', scriptPath };
  }
  const powershell = source.match(/^\s*(powershell|powershell\.exe|pwsh|pwsh\.exe)\s+(?:(?:-NoProfile|-NoLogo|-ExecutionPolicy\s+[^\s]+)\s+)*-File\s+("[^"]+"|'[^']+'|[^\s]+)\s*$/i);
  if (powershell) {
    const scriptPath = unquote(powershell[2]);
    if (SCRIPT_PATH.test(scriptPath) && /\.ps1$/i.test(scriptPath)) return { interpreter: 'powershell', scriptPath };
  }
  return null;
}

function readRegistry(registryPath) {
  if (!fs.existsSync(registryPath)) return { schema: MANAGER_SCRIPT_REGISTRY_SCHEMA, entries: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    if (parsed?.schema !== MANAGER_SCRIPT_REGISTRY_SCHEMA || !Array.isArray(parsed.entries)) return { schema: MANAGER_SCRIPT_REGISTRY_SCHEMA, entries: [] };
    return parsed;
  } catch { return { schema: MANAGER_SCRIPT_REGISTRY_SCHEMA, entries: [] }; }
}

function writeRegistry(registryPath, registry) {
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  const temporary = `${registryPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, registryPath);
}

function safetyIssue(source) {
  if (DESTRUCTIVE_SCRIPT.test(source)) return 'script-contains-destructive-operation';
  if (NETWORK_SCRIPT.test(source)) return 'script-contains-network-operation';
  return null;
}

export function registerManagerScript({ scriptPath, projectRoot, registryPath = defaultRegistryPath() } = {}) {
  try {
    const script = canonicalExisting(scriptPath, 'script');
    const project = canonicalExisting(projectRoot, 'project');
    const source = fs.readFileSync(script, 'utf8');
    const issue = safetyIssue(source);
    if (issue) return { status: 'blocked', reason: issue, registryPath };
    const parsed = parseManagerScriptCommand(`${/\.ps1$/i.test(script) ? 'powershell -File' : 'node'} "${script}"`);
    if (!parsed) return { status: 'blocked', reason: 'unsupported-manager-script', registryPath };
    const entry = {
      approvalScope: 'project-script-hash',
      scriptPath: script,
      projectRoot: project,
      interpreter: parsed.interpreter,
      sha256: sha256(source),
      approvedBy: 'owner',
      approvedAt: new Date().toISOString(),
      allowNonDestructiveOnly: true,
    };
    const registry = readRegistry(registryPath);
    const entries = registry.entries.filter((item) => !(samePath(item.scriptPath, script) && samePath(item.projectRoot, project)));
    entries.push(entry);
    writeRegistry(registryPath, { schema: MANAGER_SCRIPT_REGISTRY_SCHEMA, entries });
    return { status: 'registered', registryPath, entry };
  } catch (error) {
    return { status: 'blocked', reason: String(error.message || 'manager-script-registration-failed'), registryPath };
  }
}

export function verifyManagerScriptCommand(command, { workspacePaths = [], registryPath = defaultRegistryPath() } = {}) {
  const parsed = parseManagerScriptCommand(command);
  if (!parsed) return { approved: false, reason: 'not-a-manager-script-command' };
  let script;
  try { script = canonicalExisting(parsed.scriptPath, 'script'); }
  catch (error) { return { approved: false, reason: String(error.message || 'script-not-found') }; }
  const source = fs.readFileSync(script, 'utf8');
  const issue = safetyIssue(source);
  if (issue) return { approved: false, reason: issue, scriptPath: script, interpreter: parsed.interpreter };
  const roots = (Array.isArray(workspacePaths) ? workspacePaths : [workspacePaths]).filter(Boolean).map((root) => {
    try { return canonicalExisting(root, 'project'); } catch { return null; }
  }).filter(Boolean);
  const registry = readRegistry(registryPath);
  const digest = sha256(source);
  const entry = registry.entries.find((item) => samePath(item.scriptPath, script) && item.interpreter === parsed.interpreter && roots.some((root) => samePath(root, item.projectRoot)) && item.sha256 === digest && item.allowNonDestructiveOnly === true);
  if (!entry) return { approved: false, reason: 'manager-script-not-registered-for-project', scriptPath: script, interpreter: parsed.interpreter };
  return { approved: true, scriptPath: script, interpreter: parsed.interpreter, projectRoot: entry.projectRoot, sha256: digest, approvalScope: entry.approvalScope };
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--register')) {
    const result = registerManagerScript({ scriptPath: arg('--script'), projectRoot: arg('--project'), registryPath: arg('--registry') || defaultRegistryPath() });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.status === 'registered' ? 0 : 1;
  } else {
    process.stdout.write('Usage: node manager-script-registry.mjs --register --script <path> --project <root> [--registry <path>]\n');
  }
}
