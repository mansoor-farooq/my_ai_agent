#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length) throw new Error('Usage: npm run skills:refresh:rea');
const candidates = [process.execPath];
if (process.platform === 'win32' && process.env.USERPROFILE) {
  candidates.push(path.join(process.env.USERPROFILE, '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'bin', 'node.exe'));
}
const supportedNode = candidates.find((candidate) => {
  if (!fs.existsSync(candidate)) return false;
  const version = spawnSync(candidate, ['--version'], { encoding: 'utf8' }).stdout?.trim().replace(/^v/, '').split('.').map(Number) || [];
  return version[0] === 22 && version[1] === 23 && version[2] >= 4
    || version[0] === 24 && version[1] === 22 && version[2] >= 1
    || version[0] >= 26 && (version[0] > 26 || version[1] > 12 || version[1] === 12 && version[2] >= 1);
});
if (!supportedNode) throw new Error('REA refresh requires Node 22.23.4+, 24.22.1+, or 26.12.1+. Install a supported Node runtime, then retry.');
const npmCliCandidates = [
  process.env.npm_execpath,
  process.platform === 'win32' ? 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js' : '/usr/lib/node_modules/npm/bin/npm-cli.js',
].filter((candidate) => candidate && path.isAbsolute(candidate) && fs.existsSync(candidate));
const npmCli = npmCliCandidates[0];
const npm = npmCli ? supportedNode : process.platform === 'win32' ? 'npm.cmd' : 'npm';
const commandArgs = ['exec', '--yes', 'rea-agents@latest', '--', 'setup', '--client', 'antigravity', '--yes'];
const env = { ...process.env, PATH: `${path.dirname(supportedNode)}${path.delimiter}${process.env.PATH || ''}` };
const result = spawnSync(npm, npmCli ? [npmCli, ...commandArgs] : commandArgs, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' && !npmCli, env });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
