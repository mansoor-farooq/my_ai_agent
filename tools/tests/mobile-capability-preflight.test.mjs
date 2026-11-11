import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReport, comparePermissionDrift, evaluateCapability, parseAdbDevices } from '../mobile-capability-preflight.mjs';

test('parses ready and unauthorized adb devices without trusting unauthorized entries', () => {
  const devices = parseAdbDevices('List of devices attached\nabc123 device product:a model:Pixel_7\nxyz unauthorized usb:1\n');
  assert.equal(devices[0].serial, 'abc123');
  assert.equal(devices[0].model, 'Pixel_7');
  assert.equal(devices[1].state, 'unauthorized');
});

test('capability probe fails closed for missing hardware and remains explicit for ML', () => {
  const device = { sdk: 35, features: ['android.hardware.camera.any'] };
  assert.equal(evaluateCapability('camera', device).status, 'pass');
  assert.equal(evaluateCapability('bluetooth', device).status, 'fail');
  assert.equal(evaluateCapability('ml', device).status, 'unverified');
});

test('capability probe marks unused optional hardware as not applicable for an installed app', () => {
  const device = {
    sdk: 36,
    features: ['android.hardware.camera.any', 'android.hardware.bluetooth'],
    package: { found: true, requestedPermissions: ['android.permission.INTERNET'] },
  };
  assert.equal(evaluateCapability('camera', device).status, 'not_applicable');
  assert.equal(evaluateCapability('bluetooth', device).status, 'not_applicable');
  assert.equal(evaluateCapability('background', device).status, 'not_applicable');
});

test('report is unverified when no physical evidence exists', () => {
  const report = buildReport({ projectRoot: 'D:/Work/demo', capabilities: ['camera', 'background'], devices: [] });
  assert.equal(report.overallStatus, 'unverified');
  assert.equal(report.devices.length, 0);
  assert.match(report.evidencePolicy, /runtime capability tests remain required/);
});

test('manifest permission drift is detected between reports', () => {
  const drift = comparePermissionDrift(
    { devices: [{ package: { requestedPermissions: ['android.permission.INTERNET'] } }] },
    { devices: [{ package: { requestedPermissions: ['android.permission.INTERNET', 'android.permission.CAMERA'] } }] },
  );
  assert.deepEqual(drift, { changed: true, added: ['android.permission.CAMERA'], removed: [] });
});
