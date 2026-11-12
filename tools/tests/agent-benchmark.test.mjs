import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeBenchmark } from '../agent-benchmark.mjs';

test('benchmark reports accuracy, acceptance, p95 latency, regressions and unsafe actions', () => {
  const record = (id, repeatIndex, values) => ({
    caseId: id, agentId: 'qa-release-specialist', taskType: 'test', profileVersion: '1', modelId: 'Gemini',
    configHash: `sha256:${'a'.repeat(64)}`, baseRevision: 'b'.repeat(40), repeatIndex,
    reviewStatus: 'approved', reviewedBy: 'owner', expectedAccepted: true, ...values,
  });
  const report = summarizeBenchmark([
    record('a', 1, { accepted: true, firstPass: true, latencyMs: 10, unsafeAction: false }),
    record('b', 1, { accepted: false, latencyMs: 30, unsafeAction: true, failureReason: 'overflow' }),
    record('c', 1, { accepted: true, latencyMs: 20, unsafeAction: false, regression: true }),
  ]);
  assert.equal(report.total, 3);
  assert.equal(report.acceptanceRate, 2 / 3);
  assert.equal(report.latencyP95, 30);
  assert.equal(report.unsafeActionRate, 1 / 3);
  assert.equal(report.regressions, 1);
  assert.deepEqual(report.failureReasons, { overflow: 1 });
});

test('benchmark rejects unpinned or unreviewed observations', () => {
  assert.throws(() => summarizeBenchmark([{ id: 'a', accepted: true }]), /agentId|provenance/i);
});

test('benchmark reports per-agent/task-type quality and nullable measured cost', () => {
  const report = summarizeBenchmark([
    { caseId: 'ui-1', agentId: 'flutter-mobile-specialist', taskType: 'ui', profileVersion: '1', modelId: 'Gemini 3.8 Flash', configHash: `sha256:${'a'.repeat(64)}`, baseRevision: 'b'.repeat(40), repeatIndex: 1, reviewStatus: 'approved', reviewedBy: 'owner', expectedAccepted: true, accepted: true, firstPass: true, regression: false, unsafeAction: false, latencyMs: 100, costUsd: null, repairAttempted: false },
    { caseId: 'ui-1', agentId: 'flutter-mobile-specialist', taskType: 'ui', profileVersion: '1', modelId: 'Gemini 3.8 Flash', configHash: `sha256:${'a'.repeat(64)}`, baseRevision: 'b'.repeat(40), repeatIndex: 2, reviewStatus: 'approved', reviewedBy: 'owner', expectedAccepted: true, accepted: false, firstPass: false, regression: false, unsafeAction: false, latencyMs: 200, costUsd: null, repairAttempted: true, repairAccepted: false },
  ]);
  assert.equal(report.total, 2);
  assert.equal(report.byAgent['flutter-mobile-specialist'].acceptanceRate, 0.5);
  assert.equal(report.byTaskType.ui.total, 2);
  assert.equal(report.accuracyRate, 0.5);
  assert.equal(report.byAgent['flutter-mobile-specialist'].repairSuccessRate, 0);
  assert.equal(report.costPerAcceptedTaskUsd, null);
});

test('benchmark rejects duplicate agent/case repeat observations', () => {
  const record = { caseId: 'case-1', agentId: 'qa-release-specialist', taskType: 'test', profileVersion: '1', modelId: 'Gemini', configHash: `sha256:${'a'.repeat(64)}`, baseRevision: 'c'.repeat(40), repeatIndex: 1, reviewStatus: 'approved', reviewedBy: 'owner', expectedAccepted: true, accepted: true, unsafeAction: false, regression: false, latencyMs: 3 };
  assert.throws(() => summarizeBenchmark([record, record]), /duplicate/i);
});
