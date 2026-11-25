import test from 'node:test';
import assert from 'node:assert/strict';
import { detectAndroidTools, listAndroidDevices, selectAndroidDevice, startScrcpySession, stopScrcpySession, runAndroidEvidence, buildAndroidEvidenceReport } from '../ultra-agent-v4/android-preview.mjs';

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

test('adb device listing uses argument arrays and keeps unauthorized devices out', async () => {
  const calls = [];
  const devices = await listAndroidDevices({
    adbPath: 'adb.exe',
    execute: async (command, args, options) => {
      calls.push({ command, args, options });
      return { exitCode: 0, stdout: 'List of devices attached\nSERIAL1\tdevice product:foo model:Pixel_8\nSERIAL2\tunauthorized\n', stderr: '' };
    },
  });
  assert.deepEqual(devices.map((device) => device.serial), ['SERIAL1']);
  assert.deepEqual(calls[0].args, ['devices', '-l']);
  assert.equal(calls[0].options.timeoutMs, 15000);
});

test('Android evidence runs bounded build/install/launch/logcat/screenshot commands', async () => {
  const calls = [];
  const writes = [];
  const report = await runAndroidEvidence({
    runId: 'RUN-2',
    projectDir: 'C:\\Projects\\app',
    packageName: 'com.example.app',
    apkPath: 'build\\app\\outputs\\flutter-apk\\app-release.apk',
    serial: 'SERIAL1',
    build: true,
    startMirror: false,
  }, {
    tools: { adb: 'adb.exe', flutter: 'flutter.bat', scrcpy: null },
    listDevices: async () => [{ serial: 'SERIAL1', state: 'device', manufacturer: 'Google', model: 'Pixel 8', android: '14' }],
    execute: async (command, args, options) => {
      calls.push({ command, args, options });
      if (args[0] === 'exec-out') return { exitCode: 0, stdout: Buffer.from('PNG'), stderr: '' };
      return { exitCode: 0, stdout: 'Status: ok\nTotalTime: 123', stderr: '' };
    },
    mkdir: async () => {},
    writeFile: async (file, data) => writes.push({ file, data }),
  });
  assert.equal(report.overallStatus, 'pass');
  assert.deepEqual(calls.map((call) => call.command), ['flutter.bat', 'adb.exe', 'adb.exe', 'adb.exe', 'adb.exe']);
  assert.ok(calls.every((call) => call.options.timeoutMs === 120000));
  assert.ok(calls.some((call) => call.args.includes('install')));
  assert.ok(calls.some((call) => call.args.includes('logcat')));
  assert.equal(writes.length, 1);
});

test('Android evidence stays unverified when a required command is unavailable', async () => {
  const report = await runAndroidEvidence({ runId: 'RUN-3', projectDir: 'C:\\Projects\\app', packageName: 'com.example.app', serial: 'SERIAL1', build: true, startMirror: false }, {
    tools: { adb: 'adb.exe', flutter: null, scrcpy: null },
    listDevices: async () => [{ serial: 'SERIAL1', state: 'device' }],
    execute: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
    writeFile: async () => {},
  });
  assert.equal(report.overallStatus, 'unverified');
  assert.equal(report.checks.build.status, 'unverified');
});
