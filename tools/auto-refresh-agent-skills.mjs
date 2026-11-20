#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath;

export function shouldSyncInstalledAgents(previousVersion, currentVersion) {
  return Boolean(currentVersion && previousVersion !== currentVersion);
}

const packagePath = path.join(root, 'package.json');
const lockPath = path.join(root, 'skills-lock.json');
const readVersion = () => JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
const hashFile = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function run(command, args, label) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}.`);
}

function runNpm(args, label) {
  run(process.execPath, [npmCli, ...args], label);
}

function main() {
  if (!npmCli) throw new Error('Run this command through npm: npm run agents:auto-update:run.');
  const previousVersion = readVersion();
  const previousLockHash = hashFile(lockPath);
  run(process.execPath, ['tools/update-skill-references.mjs', '--apply'], 'Check and update approved skill references');
  const currentVersion = readVersion();
  const lockChanged = previousLockHash !== hashFile(lockPath);

  if (shouldSyncInstalledAgents(previousVersion, currentVersion)) {
    runNpm(['run', 'agents:refresh', '--', '--skip-upstream'], 'Rebuild and sync updated skills to all supported agents');
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
