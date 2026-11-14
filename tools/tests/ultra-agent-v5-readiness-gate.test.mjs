import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProductionReadiness } from '../ultra-agent-v5/readiness-gate.mjs';

const passingMetrics = {
  policyApproval: 1,
  isolation: 1,
  durableRecovery: 1,
  engineeringSuccess: 1,
  ragMemory: 1,
  observability: 1,
  mobileRelease: 1,
};

const passingGates = {
  unauthorizedTier3: 0,
  secretExposure: 0,
  untraceableSideEffects: 0,
  lostApprovalState: 0,
  failedRollbackDrills: 0,
  unexplainedAuditGaps: 0,
  mandatoryReleaseTests: true,
};

test('readiness gate reaches 1.0 only when every weighted area and hard gate passes', () => {
  const result = evaluateProductionReadiness({ metrics: passingMetrics, hardGates: passingGates });
  assert.equal(result.score, 1);
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.blockers, []);
});

test('hard safety failures block readiness even when the weighted score is high', () => {
  const result = evaluateProductionReadiness({ metrics: passingMetrics, hardGates: { ...passingGates, unauthorizedTier3: 1 } });
  assert.equal(result.score, 1);
  assert.equal(result.status, 'blocked');
  assert.ok(result.blockers.includes('hard-gate:unauthorizedTier3'));
});

test('missing evidence remains unverified and never becomes a passing score', () => {
  const result = evaluateProductionReadiness({ metrics: { ...passingMetrics, mobileRelease: null }, hardGates: passingGates });
  assert.equal(result.status, 'unverified');
  assert.ok(result.unverified.includes('mobileRelease'));
  assert.ok(result.score < 1);
});

