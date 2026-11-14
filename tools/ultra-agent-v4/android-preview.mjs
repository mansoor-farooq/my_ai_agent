#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

function firstAvailable(candidates, exists) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate === 'adb' || candidate === 'adb.exe' || candidate === 'scrcpy' || candidate === 'scrcpy.exe') return candidate;
    if (exists(candidate)) return candidate;
  }
  return null;
}

function defaultCandidates() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const userProfile = process.env.USERPROFILE || os.homedir();
  const sdkRoot = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || path.join(localAppData, 'Android', 'Sdk');
  const platformTools = path.join(sdkRoot, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
  const scrcpyNames = process.platform === 'win32' ? ['scrcpy.exe', 'scrcpy'] : ['scrcpy'];
  return {
    adb: [process.env.ADB_PATH, platformTools, path.join(userProfile, 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', 'adb.exe'), 'adb.exe', 'adb'],
    scrcpy: [process.env.SCRCPY_PATH, ...scrcpyNames],
  };
}

export function detectAndroidTools({ candidates = defaultCandidates(), exists = fs.existsSync, probe = null } = {}) {
  const adbPath = firstAvailable(candidates.adb ?? [], exists);
  const scrcpyPath = firstAvailable(candidates.scrcpy ?? [], exists);
  const adb = { available: Boolean(adbPath), path: adbPath };
  const scrcpy = { available: Boolean(scrcpyPath), path: scrcpyPath };
  if (probe) {
    if (adbPath) adb.version = probe(adbPath, ['version']);
    if (scrcpyPath) scrcpy.version = probe(scrcpyPath, ['--version']);
  }
  return { schema: 'mansoor.android-tools/v1', adb, scrcpy, status: adb.available && scrcpy.available ? 'ready' : 'unverified' };
}

function parseDevices(output) {
  return String(output ?? '').split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state, ...metadata] = line.split(/\s+/);
      const fields = Object.fromEntries(metadata.filter((item) => item.includes(':')).map((item) => {
        const index = item.indexOf(':');
        return [item.slice(0, index), item.slice(index + 1)];
      }));
      return { serial, state, manufacturer: fields.manufacturer ?? null, model: fields.model ?? null, android: fields.android ?? null, ...fields };
    });
}

export async function listAndroidDevices({ adbPath, execute, timeoutMs = 15000 } = {}) {
  if (!adbPath) return [];
  if (typeof execute !== 'function') throw new Error('execute is required to list Android devices');
  const result = await execute(adbPath, ['devices', '-l'], { timeoutMs, windowsHide: true });
  if (Number(result?.exitCode ?? 1) !== 0) return [];
  return parseDevices(result.stdout).filter((device) => device.state === 'device');
}

export function selectAndroidDevice({ devices = [], serial = null } = {}) {
  const online = devices.filter((device) => device && device.state === 'device' && device.serial);
  if (!online.length) return { status: 'unverified', reason: 'no-device', device: null };
  if (serial) {
    const selected = online.find((device) => device.serial === serial);
    return selected
      ? { status: 'selected', device: selected }
      : { status: 'unverified', reason: 'requested-device-not-online', device: null };
  }
  if (online.length > 1) return { status: 'blocked', reason: 'explicit-device-serial-required', device: null, devices: online };
  return { status: 'selected', device: online[0] };
}

export function startScrcpySession({ scrcpyPath, serial, runId, options = [], spawn: spawnProcess = spawn } = {}) {
  if (!scrcpyPath) throw new Error('scrcpyPath is required');
  if (!serial) throw new Error('serial is required');
  if (!runId) throw new Error('runId is required');
  const marker = `mansoor-agent-${String(runId).replace(/[^A-Za-z0-9._-]/g, '-')}`;
  const args = ['--serial', serial, '--window-title', marker, '--no-audio', ...options];
  const child = spawnProcess(scrcpyPath, args, { stdio: 'ignore', windowsHide: false });
  child.unref?.();
  return { schema: 'mansoor.scrcpy-session/v1', owned: true, marker, serial, runId, child, startedAt: new Date().toISOString() };
}

export function stopScrcpySession(session) {
  if (!session || session.owned !== true || typeof session.marker !== 'string' || !session.marker.startsWith('mansoor-agent-')) return { status: 'not-owned' };
  try {
    session.child?.kill?.();
    return { status: 'stopped', marker: session.marker };
  } catch (error) {
    return { status: 'failed', marker: session.marker, error: String(error?.message ?? error) };
  }
}

function hashOutput(value) {
  return `sha256:${createHash('sha256').update(Buffer.isBuffer(value) ? value : String(value ?? ''), 'utf8').digest('hex')}`;
}

function resolveEvidencePath(projectDir, relativePath) {
  const root = path.resolve(projectDir);
  const candidate = path.resolve(root, relativePath);
  const prefix = `${root}${path.sep}`;
  if (candidate !== root && !candidate.startsWith(prefix)) throw new Error('evidence path escapes project root');
  return candidate;
}

function commandCheck(id, command, args, result, timeoutMs) {
  const stdout = result?.stdout ?? '';
  const stderr = result?.stderr ?? '';
  const exitCode = Number(result?.exitCode ?? 1);
  return {
    id,
    command,
    args,
    timeoutMs,
    status: exitCode === 0 ? 'pass' : 'fail',
    exit_code: exitCode,
    stdout_hash: hashOutput(stdout),
    stderr_hash: hashOutput(stderr),
  };
}

export async function runAndroidEvidence(request = {}, deps = {}) {
  const {
    runId,
    projectDir,
    packageName,
    serial = null,
    apkPath = 'build\\app\\outputs\\flutter-apk\\app-release.apk',
    build = true,
    startMirror = true,
    evidenceDir = path.join('.agents', 'android-preview'),
    timeoutMs = 120000,
  } = request;
  if (!runId || !projectDir || !packageName) throw new Error('runId, projectDir and packageName are required');
  const tools = deps.tools ?? detectAndroidTools();
  const execute = deps.execute;
  const writeFile = deps.writeFile ?? ((file, data) => fs.promises.writeFile(file, data));
  const mkdir = deps.mkdir ?? ((directory) => fs.promises.mkdir(directory, { recursive: true }));
  if (typeof execute !== 'function') throw new Error('execute is required for Android evidence');
  let devices = [];
  try {
    devices = await (deps.listDevices ? deps.listDevices() : listAndroidDevices({ adbPath: tools.adb, execute }));
  } catch {
    devices = [];
  }
  const selection = selectAndroidDevice({ devices, serial });
  const checks = {};
  const selected = selection.device;
  const run = async (id, command, args) => {
    try {
      if (!command) {
        checks[id] = { id, status: 'unverified', reason: 'required tool is unavailable' };
        return null;
      }
      const result = await execute(command, args, { cwd: path.resolve(projectDir), timeoutMs, windowsHide: true });
      checks[id] = commandCheck(id, command, args, result, timeoutMs);
      return result;
    } catch (error) {
      checks[id] = { id, status: 'fail', reason: String(error?.message ?? error) };
      return null;
    }
  };

  if (selection.status !== 'selected') {
    checks.device = { id: 'device', status: selection.status === 'blocked' ? 'fail' : 'unverified', reason: selection.reason };
    return buildAndroidEvidenceReport({ runId, device: null, scrcpy: { status: 'unverified', reason: selection.reason }, checks });
  }

  const adbArgs = (args) => ['-s', selected.serial, ...args];
  if (build) await run('build', tools.flutter, ['build', 'apk', '--release']);
  const resolvedApk = resolveEvidencePath(projectDir, apkPath);
  await run('install', tools.adb, adbArgs(['install', '-r', resolvedApk]));
  const launch = await run('launch', tools.adb, adbArgs(['shell', 'am', 'start', '-W', '-a', 'android.intent.action.MAIN', '-c', 'android.intent.category.LAUNCHER', '-n', `${packageName}/.MainActivity`]));
  if (launch?.stdout && !/Status:\s*ok/i.test(String(launch.stdout)) && checks.launch?.status === 'pass') checks.launch.status = 'unverified';
  await run('logcat', tools.adb, adbArgs(['logcat', '-d', '-t', '200']));
  try {
    const screenshot = await execute(tools.adb, adbArgs(['exec-out', 'screencap', '-p']), { cwd: path.resolve(projectDir), timeoutMs, windowsHide: true });
    if (Number(screenshot?.exitCode ?? 1) === 0) {
      const file = resolveEvidencePath(projectDir, path.join(evidenceDir, `${runId}.png`));
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, screenshot.stdout);
      checks.screenshot = { id: 'screenshot', status: 'pass', path: path.relative(path.resolve(projectDir), file).replaceAll('\\', '/'), stdout_hash: hashOutput(screenshot.stdout) };
    } else checks.screenshot = { id: 'screenshot', status: 'fail', exit_code: screenshot?.exitCode ?? 1, stdout_hash: hashOutput(screenshot?.stdout), stderr_hash: hashOutput(screenshot?.stderr) };
  } catch (error) {
    checks.screenshot = { id: 'screenshot', status: 'fail', reason: String(error?.message ?? error) };
  }

  let scrcpy = { status: 'not_requested' };
  if (startMirror) {
    if (!tools.scrcpy) scrcpy = { status: 'unverified', reason: 'scrcpy is not installed on this host' };
    else {
      try {
        scrcpy = startScrcpySession({ scrcpyPath: tools.scrcpy, serial: selected.serial, runId });
        scrcpy.status = 'started';
      } catch (error) { scrcpy = { status: 'unverified', reason: String(error?.message ?? error) }; }
    }
  }
  return buildAndroidEvidenceReport({ runId, device: selected, scrcpy, checks });
}

export function buildAndroidEvidenceReport({ runId, device = null, scrcpy = { status: 'unverified' }, checks = {} } = {}) {
  const checkValues = Object.values(checks ?? {});
  const hasFailure = checkValues.some((check) => check?.status === 'fail');
  const hasUnverified = checkValues.some((check) => check?.status === 'unverified');
  const missingRuntimeEvidence = !device || scrcpy?.status === 'unverified' || scrcpy?.status === 'blocked';
  const overallStatus = hasFailure ? 'fail' : (hasUnverified || missingRuntimeEvidence ? 'unverified' : 'pass');
  return {
    schema: 'mansoor.android-preview/v1',
    runId,
    generatedAt: new Date().toISOString(),
    device,
    scrcpy,
    checks,
    overallStatus,
  };
}

