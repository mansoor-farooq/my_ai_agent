import test from 'node:test';
import assert from 'node:assert/strict';
import { createEffectKey, claimEffect, completeEffect, readEffect } from '../ultra-agent-v4/effects.mjs';

test('effect keys are stable and payload-sensitive', () => {
  const first = createEffectKey({ projectId: 'p1', taskId: 't1', action: 'git-push', target: 'origin/main', payload: { sha: 'abc' } });
  const same = createEffectKey({ projectId: 'p1', taskId: 't1', action: 'git-push', target: 'origin/main', payload: { sha: 'abc' } });
  const changed = createEffectKey({ projectId: 'p1', taskId: 't1', action: 'git-push', target: 'origin/main', payload: { sha: 'def' } });
  assert.equal(first, same);
  assert.notEqual(first, changed);
});

test('duplicate effect claims are rejected and completed receipts are readable', () => {
  const store = new Map();
  const request = { projectId: 'p1', taskId: 't1', action: 'file-write', target: 'src/app.ts', payload: { hash: 'x' } };
  const first = claimEffect(request, store);
  assert.equal(first.claimed, true);
  assert.equal(claimEffect(request, store).claimed, false);
  completeEffect(first.key, { ok: true, receipt: 'diff-1' }, store);
  assert.deepEqual(readEffect(first.key, store).receipt, { ok: true, receipt: 'diff-1' });
});

test('claim rejects a changed payload for the same effect key', () => {
  const store = new Map();
  const first = claimEffect({ projectId: 'p1', taskId: 't1', action: 'deploy', target: 'staging', payload: { version: 1 } }, store);
  assert.throws(() => claimEffect({ projectId: 'p1', taskId: 't1', action: 'deploy', target: 'staging', payload: { version: 2 }, effectKey: first.key }, store), /payload mismatch/i);
});
