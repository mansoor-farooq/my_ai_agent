#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath;

export function shouldSyncInstalledAgents(previousVersion, currentVersion, installedVersion, lastSyncedVersion) {
  return Boolean(currentVersion && (
    previousVersion !== currentVersion
    || installedVersion !== currentVersion
    || lastSyncedVersion !== currentVersion
  ));
}

export function writeSyncState(statePath, version, completedAt = new Date()) {
  const directory = path.dirname(statePath);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryPath = `${statePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  const document = {
    schema: 'mansoor.agent-skill-auto-update-state/v1',
    lastSyncedVersion: version,
    completedAt: completedAt.toISOString(),
  };
  fs.writeFileSync(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  fs.renameSync(temporaryPath, statePath);
}

export function readLastSyncedVersion(statePath) {
  let document;
  try {
    document = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    if (!(error instanceof SyntaxError)) throw error;
    console.warn('Ignoring malformed local agent skill refresh state; all providers will be synced again.');
    return '';
  }
  if (document?.schema !== 'mansoor.agent-skill-auto-update-state/v1' || typeof document.lastSyncedVersion !== 'string') {
    console.warn('Ignoring unsupported local agent skill refresh state; all providers will be synced again.');
    return '';
  }
  return document.lastSyncedVersion;
}

const packagePath = path.join(root, 'package.json');
const lockPath = path.join(root, 'skills-lock.json');
const installedPluginPath = path.join(root, 'dist', 'mansoor-agent-hub', 'plugin.json');
const statePath = path.join(process.env.LOCALAPPDATA || root, 'MansoorAITeamManager', 'agent-skill-auto-update-state.json');
const readVersion = () => JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
const hashFile = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function readInstalledVersion(manifestPath = installedPluginPath) {
  let document;
  try { document = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch (error) {
    if (error?.code === 'ENOENT') return '';
    if (!(error instanceof SyntaxError)) throw error;
    console.warn('Ignoring malformed Antigravity bundle manifest; the next sync will rebuild it.');
    return '';
  }
  if (typeof document?.version !== 'string' || !document.version) {
    console.warn('Ignoring Antigravity bundle manifest without a version; the next sync will rebuild it.');
    return '';
  }
  return document.version;
}

function run(command, args, label, env) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: env ? { ...process.env, ...env } : process.env });
  if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}.`);
}

function runNpm(args, label, env) {
  run(process.execPath, [npmCli, ...args], label, env);
}

function main() {
  if (!npmCli) throw new Error('Run this command through npm: npm run agents:auto-update:run.');
  const previousVersion = readVersion();
  const previousLockHash = hashFile(lockPath);
  run(process.execPath, ['tools/update-skill-references.mjs', '--apply'], 'Check and update approved skill references');
  const currentVersion = readVersion();
  const installedVersion = readInstalledVersion();
  const lastSyncedVersion = readLastSyncedVersion(statePath);
  const lockChanged = previousLockHash !== hashFile(lockPath);

  if (shouldSyncInstalledAgents(previousVersion, currentVersion, installedVersion, lastSyncedVersion)) {
    run(process.execPath, ['tools/generate-skill-provenance.mjs'], 'Prepare updated skill provenance');
    run(process.execPath, ['tools/update-key-checksums.mjs'], 'Prepare updated release checksums');
    runNpm(['test'], 'Validate agent behavior, policies, and contracts');
    run(process.execPath, ['tools/run-agent-security-fixtures.mjs'], 'Run agent security behavior fixtures');
    runNpm(['run', 'secret-scan'], 'Validate skill and source secret hygiene');
    runNpm(['run', 'agents:refresh'], 'Rebuild and sync updated skills to all supported agents', { MANSOOR_AGENT_REFRESH_SKIP_UPSTREAM: '1' });
    writeSyncState(statePath, currentVersion);
  } else if (lockChanged) {
    run(process.execPath, ['tools/generate-skill-provenance.mjs'], 'Refresh skill provenance');
    run(process.execPath, ['tools/update-key-checksums.mjs'], 'Refresh release source checksums');
    console.log('\nUpstream references changed without skill-content changes; agent installs are already current.');
  } else {
    console.log('\nNo upstream skill changes found; installed agent skills are current.');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
