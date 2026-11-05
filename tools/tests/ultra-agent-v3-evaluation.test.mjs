import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { evaluateCompletion } from '../ultra-agent-v3/evaluate.mjs';
import { appendTrace } from '../ultra-agent-v3/trace.mjs';

test('rejects completion when no verification record exists', () => {
  const result = evaluateCompletion({ mode: 'fast', changedPaths: ['src/app.ts'], verificationRecords: [], commandResults: [] });
  assert.equal(result.accepted, false);
  assert.ok(result.missingEvidence.includes('targeted-verification'));
  assert.equal(result.nextState, 'VERIFY');
});

test('accepts fast completion with a passing targeted command and changed-path summary', () => {
  const result = evaluateCompletion({
    mode: 'fast',
    changedPaths: ['src/app.ts'],
    verificationRecords: [{ id: 'check-1', status: 'pass', kind: 'verification' }],
    commandResults: [{ command: 'npm test -- app', status: 'pass' }],
  });
  assert.equal(result.accepted, true);
  assert.deepEqual(result.missingEvidence, []);
  assert.equal(result.nextState, 'COMPLETE');
});

test('premium high-risk failure becomes recoverable and preserves a resume checkpoint', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-eval-'));
  try {
    const trace = await appendTrace({ dir, taskId: 'task-003', projectId: 'project-003', evidenceRefs: ['check-2'], event: 'verification-failed', status: 'fail', result: 'test failed' });
    assert.match(trace.tracePath, /task-003\.jsonl$/);
    assert.equal(trace.record.projectId, 'project-003');
    assert.deepEqual(trace.record.evidenceRefs, ['check-2']);
    const result = evaluateCompletion({
      dir,
      taskId: 'task-003',
      mode: 'premium',
      risk: 'high',
      changedPaths: ['src/security.ts'],
      verificationRecords: [{ id: 'check-2', status: 'pass', kind: 'verification' }],
      commandResults: [{ command: 'npm test', status: 'fail', result: 'assertion failed' }],
    });
    assert.equal(result.accepted, false);
    assert.equal(result.nextState, 'RECOVERABLE_FAILURE');
    assert.ok(result.resumeCheckpoint);
    assert.equal(result.resumeCheckpoint.taskId, 'task-003');
    await access(result.resumeCheckpoint.checkpointPath);
    const ledger = await readFile(path.join(dir, '.agents', 'ultra-v3', 'traces', 'task-003.jsonl'), 'utf8');
    assert.match(ledger, /verification-failed/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('premium research cannot complete without a research-ledger record', () => {
  const result = evaluateCompletion({
    mode: 'premium',
    explicitResearch: true,
    changedPaths: ['docs/architecture.md'],
    researchRecords: [],
    verificationRecords: [{ id: 'check-4', status: 'pass', kind: 'verification' }],
    commandResults: [{ command: 'npm test', status: 'pass' }],
  });
  assert.equal(result.accepted, false);
  assert.ok(result.missingEvidence.includes('research-ledger'));
});

test('premium high-risk completion requires an independent check', () => {
  const result = evaluateCompletion({
    mode: 'premium',
    risk: 'high',
    changedPaths: ['src/security.ts'],
    verificationRecords: [{ id: 'check-3', status: 'pass', kind: 'verification' }],
    commandResults: [{ command: 'npm test', status: 'pass' }],
  });
  assert.equal(result.accepted, false);
  assert.ok(result.missingEvidence.includes('independent-check'));
});
