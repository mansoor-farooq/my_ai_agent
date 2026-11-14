import test from 'node:test';
import assert from 'node:assert/strict';
import { detectAndroidTools, selectAndroidDevice, startScrcpySession, stopScrcpySession, buildAndroidEvidenceReport } from '../ultra-agent-v4/android-preview.mjs';

test('Android tool discovery reports explicit missing scrcpy instead of guessing', () => {
  const result = detectAndroidTools({ candidates: { adb: ['C:\\Android\\adb.exe'], scrcpy: ['C:\\Tools\\scrcpy.exe'] }, exists: (file) => file.endsWith('adb.exe') });
  assert.equal(result.adb.available, true);
  assert.equal(result.scrcpy.available, false);
  assert.equal(result.status, 'unverified');
});

test('device selection requires an explicit serial when multiple devices are online', () => {
  const devices = [{ serial: 'A', state: 'device' }, { serial: 'B', state: 'device' }];
  assert.equal(selectAndroidDevice({ devices }).status, 'blocked');
  assert.equal(selectAndroidDevice({ devices, serial: 'B' }).device.serial, 'B');
});

test('scrcpy session uses selected serial and a Mansoor-owned marker', () => {
  const calls = [];
  const child = { kill() { calls.push('kill'); }, once() {}, unref() {} };
  const session = startScrcpySession({ scrcpyPath: 'scrcpy.exe', serial: 'emulator-5554', runId: 'RUN-1', spawn: (...args) => { calls.push(args); return child; } });
  assert.equal(session.marker, 'mansoor-agent-RUN-1');
  assert.ok(calls[0][1].includes('--serial'));
  assert.ok(calls[0][1].includes('emulator-5554'));
  assert.ok(calls[0][1].includes('--window-title'));
  stopScrcpySession(session);
  assert.deepEqual(calls.at(-1), 'kill');
});

test('preview evidence cannot convert missing device or mirror into a passing run', () => {
  const report = buildAndroidEvidenceReport({ runId: 'RUN-1', device: null, scrcpy: { status: 'unverified' }, checks: { build: { status: 'pass' } } });
  assert.equal(report.overallStatus, 'unverified');
  assert.equal(report.scrcpy.status, 'unverified');
});
