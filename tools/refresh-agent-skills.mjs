#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageNeedsRebuild } from './update-skill-references.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this command through npm: npm run agents:refresh.');
const skipUpstream = process.env.MANSOOR_AGENT_REFRESH_SKIP_UPSTREAM === '1';

function run(command, args, label) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}.`);
}

function runNpm(args, label) {
  run(process.execPath, [npmCli, ...args], label);
}

const agy = spawnSync('agy', ['plugin', 'list'], { cwd: root, stdio: 'ignore' });
if (agy.error) throw new Error('Antigravity CLI (agy) is not available; install the host CLI before running the all-agent refresh.');
if (agy.status !== 0) throw new Error(`Antigravity CLI preflight failed with exit code ${agy.status}.`);

if (!skipUpstream) run(process.execPath, ['tools/update-skill-references.mjs', '--apply'], 'Fetch and validate declared upstream skill references');
run(process.execPath, ['tools/generate-skill-provenance.mjs'], 'Refresh skill provenance');
run(process.execPath, ['tools/update-key-checksums.mjs'], 'Refresh release source checksums');
const sourceVersion = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
let installedVersion = '';
try {
  installedVersion = JSON.parse(readFileSync(path.join(root, 'dist', 'mansoor-agent-hub', 'plugin.json'), 'utf8')).version;
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
if (packageNeedsRebuild(sourceVersion, installedVersion)) {
  runNpm(['run', 'build:package'], 'Build and verify the portable Antigravity bundle');
} else {
  console.log(`\n=== Antigravity bundle already built at ${sourceVersion}; build skipped ===`);
}
runNpm(['run', 'agents:install:gemini'], 'Sync discovered profiles, skills, and policies to Gemini CLI');
runNpm(['run', 'agents:install:codex'], 'Sync the Codex Flutter specialist');
run('agy', ['plugin', 'install', path.join(root, 'dist', 'mansoor-agent-hub')], 'Install the verified Antigravity bundle');

console.log('\nAll supported local agent installations are refreshed. Host permission settings were not synchronized or changed.');
