import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateP95, buildReleaseReport } from '../flutter-release-gate.mjs';

test('calculates p95 latency with a deterministic nearest-rank rule', () => {
  assert.equal(calculateP95([10, 20, 30, 40, 50]), 50);
});

test('release report blocks when analysis or build fails', () => {
  const report = buildReleaseReport({ project: 'D:/Work/App', analyze: { ok: true }, tests: { ok: true }, build: { ok: false }, apkBytes: 10 });
  assert.equal(report.overallStatus, 'fail');
  assert.equal(report.gates.build, 'fail');
});
