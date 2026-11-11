import test from 'node:test';
import assert from 'node:assert/strict';
import { addDeepLinkCheck, buildSmokeReport, parsePackageState } from '../android-runtime-smoke.mjs';

test('package state parser records installed package without trusting arbitrary output', () => {
  const state = parsePackageState('versionCode=42 minSdk=24 targetSdk=35\n  versionName=1.2.3');
  assert.equal(state.installed, true);
  assert.equal(state.versionCode, '42');
  assert.equal(state.targetSdk, '35');
});

test('runtime smoke report fails closed when a device is missing', () => {
  const report = buildSmokeReport({ packageName: 'com.example.app', device: null, checks: {} });
  assert.equal(report.overallStatus, 'unverified');
  assert.equal(report.checks.launch.status, 'unverified');
});

test('deep-link evidence does not overwrite an otherwise passing launch check', () => {
  const checks = addDeepLinkCheck({
    launch: { status: 'pass', reason: 'pid found' },
    backNavigation: { status: 'pass', reason: 'back delivered' },
  }, { status: 'fail', reason: 'No matching intent filter' });
  const report = buildSmokeReport({
    packageName: 'com.example.app',
    device: { serial: 'abc', manufacturer: 'samsung', model: 'test', android: '16', sdk: 36 },
    checks,
  });
  assert.equal(report.checks.launch.status, 'pass');
  assert.equal(report.checks.deepLink.status, 'fail');
  assert.equal(report.overallStatus, 'fail');
});

