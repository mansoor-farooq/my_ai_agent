#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function calculateP95(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

export function buildReleaseReport({ project, analyze, tests, build, apkBytes = null, startupMs = [], androidPreview = null }) {
  const gates = {
    analyze: analyze.ok ? 'pass' : 'fail',
    tests: tests.ok ? 'pass' : 'fail',
    build: build.ok ? 'pass' : 'fail',
  };
  return {
    schema: 'mansoor.flutter-release-gate/v1',
    project,
    generatedAt: new Date().toISOString(),
    overallStatus: Object.values(gates).includes('fail') || androidPreview?.overallStatus === 'fail' ? 'fail' : 'pass',
    gates,
    apkBytes,
    startupMs: startupMs.length ? { samples: startupMs, p95: calculateP95(startupMs) } : { samples: [], p95: null, status: 'not_measured' },
    frameDrops: { status: 'not_measured', reason: 'Requires profile-mode timeline capture on a target device.' },
    evidence: { analyze, tests, build },
    androidPreview,
  };
}

function resolveFlutter() {
  const candidates = [process.env.FLUTTER_PATH, process.platform === 'win32' ? 'flutter.bat' : 'flutter'];
  if (process.platform === 'win32') {
    try {
      const matches = execFileSync('where.exe', ['flutter'], { encoding: 'utf8' }).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      candidates.unshift(...matches.filter((item) => item.toLowerCase().endsWith('.bat')));
      candidates.unshift(...matches.filter((item) => !item.toLowerCase().endsWith('.bat')) .map((item) => `${item}.bat`));
    } catch { /* fallback below */ }
  }
  return candidates.find((candidate) => candidate === 'flutter.bat' || candidate === 'flutter' || fs.existsSync(candidate)) || 'flutter';
}

function runFlutter(project, args) {
  try {
    const command = resolveFlutter();
    const output = process.platform === 'win32'
      ? execFileSync('cmd.exe', ['/d', '/c', command, ...args], { cwd: project, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      : execFileSync(command, args, { cwd: project, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, command: [command, ...args].join(' '), output: output.slice(-4000) };
  } catch (error) {
    return { ok: false, command: ['flutter', ...args].join(' '), output: `${error.stdout ?? ''}\n${error.stderr ?? ''}\n${error.message ?? ''}`.slice(-4000) };
  }
}

function main() {
  const argv = process.argv.slice(2);
  const projectIndex = argv.indexOf('--project');
  const project = projectIndex === -1 ? process.cwd() : path.resolve(argv[projectIndex + 1]);
  const outIndex = argv.indexOf('--out');
  const out = outIndex === -1 ? null : path.resolve(argv[outIndex + 1]);
  const analyze = runFlutter(project, ['analyze', '--no-pub']);
  const tests = runFlutter(project, ['test', '--no-pub']);
  const build = runFlutter(project, ['build', 'apk', '--release']);
  const apk = path.join(project, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
  const smokePath = path.join(project, '.agents', 'android-runtime-smoke.json');
  const smoke = fs.existsSync(smokePath) ? JSON.parse(fs.readFileSync(smokePath, 'utf8')) : null;
  const startup = Number(smoke?.checks?.startup?.evidence);
  const previewPath = path.join(project, '.agents', 'android-preview.json');
  const androidPreview = fs.existsSync(previewPath) ? JSON.parse(fs.readFileSync(previewPath, 'utf8')) : null;
  const report = buildReleaseReport({ project, analyze, tests, build, apkBytes: fs.existsSync(apk) ? fs.statSync(apk).size : null, startupMs: Number.isFinite(startup) ? [startup] : [], androidPreview });
  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.overallStatus === 'fail') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
