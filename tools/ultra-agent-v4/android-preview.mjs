#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

export function detectAndroidTools({ candidates = defaultCandidates(), exists = fs.existsSync } = {}) {
  const adbPath = firstAvailable(candidates.adb ?? [], exists);
  const scrcpyPath = firstAvailable(candidates.scrcpy ?? [], exists);
  const adb = { available: Boolean(adbPath), path: adbPath };
  const scrcpy = { available: Boolean(scrcpyPath), path: scrcpyPath };
  return { schema: 'mansoor.android-tools/v1', adb, scrcpy, status: adb.available && scrcpy.available ? 'ready' : 'unverified' };
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

