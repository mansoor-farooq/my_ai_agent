#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { projectIdentity } from './project-identity.mjs';
import { auditContract } from './contract.mjs';

const args = process.argv.slice(2);
const getArg = (name, fallback = '') => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const projectDir = path.resolve(getArg('--dir', process.cwd()));
const strict = args.includes('--strict');
if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
  throw new Error(`Project directory does not exist: ${projectDir}`);
}

function command(commandName, commandArgs = []) {
  const executable = process.platform === 'win32' ? 'where.exe' : 'which';
  const located = spawnSync(executable, [commandName], { encoding: 'utf8', windowsHide: true });
  if (located.status !== 0) return { available: false, version: null };
  const version = spawnSync(commandName, commandArgs, { cwd: projectDir, encoding: 'utf8', windowsHide: true });
  return { available: version.status === 0, version: (version.stdout || version.stderr || '').trim().split(/\r?\n/)[0] || null };
}

function git(gitArgs) {
  const result = spawnSync('git', gitArgs, { cwd: projectDir, encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : '';
}

function has(relative) { return fs.existsSync(path.join(projectDir, relative)); }

const packageFiles = [
  'package.json', 'pnpm-lock.yaml', 'yarn.lock', 'package-lock.json',
  'pubspec.yaml', 'pyproject.toml', 'requirements.txt', 'Pipfile',
  'go.mod', 'Cargo.toml', 'composer.json', 'Dockerfile',
].filter(has);
const dotnetFiles = fs.readdirSync(projectDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(sln|csproj|fsproj|vbproj)$/i.test(entry.name))
  .map((entry) => entry.name);
packageFiles.push(...dotnetFiles);

const projectName = getArg('--project', path.basename(projectDir));
const project = projectIdentity({ dir: projectDir, project: projectName });
const checks = {
  git: command('git', ['--version']),
  node: command('node', ['--version']),
  npm: command('npm', ['--version']),
  python: command(process.platform === 'win32' ? 'py' : 'python3', ['--version']),
  flutter: command('flutter', ['--version']),
  dart: command('dart', ['--version']),
  dotnet: command('dotnet', ['--version']),
  docker: command('docker', ['--version']),
};

const required = new Set(['git']);
if (packageFiles.some((file) => /^(package\.json|pnpm-lock|yarn\.lock|package-lock)/i.test(file))) {
  required.add('node');
  required.add('npm');
}
if (packageFiles.some((file) => /^pubspec\.yaml$/i.test(file))) required.add('flutter');
if (packageFiles.some((file) => /^(pyproject\.toml|requirements\.txt|Pipfile)/i.test(file))) required.add('python');
if (dotnetFiles.length) required.add('dotnet');

const missing = [...required].filter((name) => !checks[name]?.available);
const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  project,
  manifests: [...new Set(packageFiles)].sort(),
  requiredTools: [...required].sort(),
  checks,
  missing,
  contract: await auditContract({ dir: projectDir, project: projectName }),
  status: missing.length ? 'needs-setup' : 'ready',
  safety: { credentialsRead: false, projectFilesUploaded: false, hiddenReasoningExported: false },
};

console.log(JSON.stringify(result, null, 2));
if (strict && missing.length) process.exitCode = 1;

