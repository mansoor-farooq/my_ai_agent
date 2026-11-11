import test from 'node:test';
import assert from 'node:assert/strict';
import { runConvergence } from '../ultra-agent-v4/recovery.mjs';
import { mergeWaveResults } from '../ultra-agent-v3/delegation.mjs';

test('convergence retries targeted failures and stops at the bound', async () => {
  let attempts = 0;
  const result = await runConvergence({ maxAttempts: 2, checks: async () => { attempts += 1; return { ok: false, failedChecks: ['test:cart'] }; }, repair: async () => ({ scope: ['test:cart'] }) });
  assert.equal(result.ok, false);
  assert.equal(result.attempts, 2);
  assert.equal(attempts, 2);
  assert.equal(result.stopReason, 'attempt-limit');
});

test('security failures do not retry', async () => {
  const result = await runConvergence({ checks: async () => ({ ok: false, failureCode: 'security-policy', failedChecks: ['secret-scan'] }), repair: async () => ({}) });
  assert.equal(result.stopReason, 'security-policy');
  assert.equal(result.attempts, 1);
});

test('parallel wave results merge deterministically', () => {
  const merged = mergeWaveResults([{ workItemId: 'b', status: 'complete', changedPaths: ['b.ts'] }, { workItemId: 'a', status: 'complete', changedPaths: ['a.ts'] }]);
  assert.deepEqual(merged.workItemIds, ['a', 'b']);
  assert.deepEqual(merged.changedPaths, ['a.ts', 'b.ts']);
});
