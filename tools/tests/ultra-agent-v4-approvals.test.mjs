import test from 'node:test';
import assert from 'node:assert/strict';
import { createApprovalRequest, bindApproval, resolveApproval, canResume } from '../ultra-agent-v4/approvals.mjs';

test('approval binds to project, call and payload', () => {
  const request = createApprovalRequest({ projectId: 'p1', taskId: 't1', action: 'git-push', callId: 'call-1', payload: { branch: 'main' } });
  assert.equal(request.status, 'pending');
  assert.equal(bindApproval(request, { branch: 'main' }).valid, true);
  assert.equal(bindApproval(request, { branch: 'release' }).valid, false);
  assert.equal(canResume(request, { projectId: 'p1', callId: 'call-1', payload: { branch: 'main' } }), false);
});

test('approve and reject decisions are terminal and cannot be duplicated', () => {
  const request = createApprovalRequest({ projectId: 'p1', taskId: 't1', action: 'deploy', callId: 'call-2', payload: { env: 'staging' } });
  const approved = resolveApproval(request, { decision: 'approve', actor: 'human' });
  assert.equal(approved.status, 'approved');
  assert.equal(canResume(approved, { projectId: 'p1', callId: 'call-2', payload: { env: 'staging' } }), true);
  assert.throws(() => resolveApproval(approved, { decision: 'reject', actor: 'human' }), /terminal/i);
});

test('wrong project cannot resume an approved request', () => {
  const request = createApprovalRequest({ projectId: 'p1', taskId: 't1', action: 'file-write', callId: 'call-3', payload: { path: 'src/a.ts' } });
  const approved = resolveApproval(request, { decision: 'approve', actor: 'human' });
  assert.equal(canResume(approved, { projectId: 'p2', callId: 'call-3', payload: { path: 'src/a.ts' } }), false);
});
