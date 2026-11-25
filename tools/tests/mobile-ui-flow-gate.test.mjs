import test from 'node:test';
import assert from 'node:assert/strict';
import { detectUiTestTools, runMobileUiFlowGate, summarizeDeviceEvidence } from '../mobile-ui-flow-gate.mjs';

test('missing mobile UI runners stay unverified', async () => {
  assert.deepEqual(detectUiTestTools({ commands: {} }), { flutterIntegration: false, patrol: false, maestro: false });
  const report = await runMobileUiFlowGate({ projectDir: 'D:/Work/app', flows: [{ id: 'home', semantics: ['home-title'] }], tools: {} });
  assert.equal(report.status, 'unverified');
});

test('flow gate rejects a flow without stable semantic identifiers', async () => {
  const report = await runMobileUiFlowGate({ projectDir: 'D:/Work/app', flows: [{ id: 'home', semantics: [] }], tools: { flutterIntegration: true } });
  assert.equal(report.status, 'blocked');
  assert.equal(report.reason, 'missing-semantic-identifiers');
});

test('device evidence summary reports coverage and missing profiles', () => {
  const summary = summarizeDeviceEvidence([{ device: 'samsung', android: '16', status: 'pass' }]);
  assert.equal(summary.passingProfiles.length, 1);
  assert.equal(summary.coverage, 1 / 9);
  assert.equal(summary.expected, 9);
  assert.equal(summary.status, 'unverified');
});
