import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeBenchmark } from '../agent-benchmark.mjs';

test('benchmark reports accuracy, acceptance, p95 latency, regressions and unsafe actions', () => {
  const report = summarizeBenchmark([
    { id: 'a', accepted: true, latencyMs: 10, unsafeAction: false },
    { id: 'b', accepted: false, latencyMs: 30, unsafeAction: true, failureReason: 'overflow' },
    { id: 'c', accepted: true, latencyMs: 20, unsafeAction: false, regression: true },
  ]);
  assert.equal(report.total, 3);
  assert.equal(report.acceptanceRate, 2 / 3);
  assert.equal(report.latencyP95, 30);
  assert.equal(report.unsafeActionRate, 1 / 3);
  assert.equal(report.regressions, 1);
  assert.deepEqual(report.failureReasons, { overflow: 1 });
});
