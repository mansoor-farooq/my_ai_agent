import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createActionManifest, createApprovalAuthority } from '../ultra-agent-v5/action-manifest.mjs';
import { DurableActionLedger, createFileBackedApprovalAuthority, createStableEffectKey } from '../ultra-agent-v5/durable-ledger.mjs';

const fixedNow = new Date('2026-11-13T10:00:00.000Z');

function tempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mansoor-v5-ledger-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function manifest(nonce = 'nonce-ledger-1') {
  return createActionManifest({
    task: { projectId: 'project-a', taskId: 'task-1', projectDir: process.cwd(), objective: 'change one file', scope: ['src/**'], acceptance: ['check passes'] },
    plan: { affectedPaths: ['src/app.mjs'], checks: [{ id: 'check', tool: 'node', args: ['--version'] }] },
    actions: [{ type: 'write', path: 'src/app.mjs', content: 'export const value = 1;' }],
    workspace: { workspaceId: 'workspace-a', baseRevision: 'a'.repeat(40) },
    policy: { version: 'policy/v1', registryHash: 'sha256:registry' },
  }, { now: fixedNow, ttlMs: 60_000, nonce });
}

test('ledger persists and verifies the run state transition chain across instances', (t) => {
  const directory = tempDir(t);
  const first = new DurableActionLedger({ directory, projectId: 'project-a', taskId: 'task-1', now: () => fixedNow });
  first.transition('run', 'nonce-1', 'prepared', { manifestHash: 'sha256:one' });
  first.transition('run', 'nonce-1', 'awaiting_approval', { manifestHash: 'sha256:one' });

  const reopened = new DurableActionLedger({ directory, projectId: 'project-a', taskId: 'task-1', now: () => fixedNow });
  assert.equal(reopened.state('run', 'nonce-1').status, 'awaiting_approval');
  assert.equal(reopened.events().length, 2);
  assert.throws(() => reopened.transition('run', 'nonce-1', 'promoted'), /illegal-ledger-transition/);
});

test('approval consumption is manifest-bound, durable and resumable only for the exact receipt', (t) => {
  const directory = tempDir(t);
  const ledger = new DurableActionLedger({ directory, projectId: 'project-a', taskId: 'task-1', now: () => fixedNow });
  const authority = createFileBackedApprovalAuthority(directory);
  const action = manifest();
  ledger.transition('run', action.nonce, 'prepared', { manifestHash: action.manifestHash });
  ledger.transition('run', action.nonce, 'awaiting_approval', { manifestHash: action.manifestHash });
  ledger.transition('approval', action.nonce, 'awaiting_approval', { manifestHash: action.manifestHash });
  const receipt = authority.issue(action, { approved: true, actor: 'owner', source: 'host-review', issuedAt: fixedNow.toISOString() });

  assert.equal(ledger.consumeApproval(receipt, action, authority, { now: fixedNow }).valid, true);
  const reopened = new DurableActionLedger({ directory, projectId: 'project-a', taskId: 'task-1', now: () => fixedNow });
  assert.equal(reopened.consumeApproval(receipt, action, createFileBackedApprovalAuthority(directory), { now: fixedNow }).resumed, true);
  const forged = { ...receipt, receiptId: 'APR-forged' };
  assert.equal(reopened.consumeApproval(forged, action, createFileBackedApprovalAuthority(directory), { now: fixedNow }).valid, false);
  assert.equal(reopened.consumeApproval(receipt, manifest('nonce-ledger-2'), authority, { now: fixedNow }).valid, false);
});

test('expired approval cannot be resumed and denied decisions never enter the ledger', (t) => {
  const directory = tempDir(t);
  const ledger = new DurableActionLedger({ directory, projectId: 'project-a', taskId: 'task-1', now: () => fixedNow });
  const authority = createApprovalAuthority({ secret: 'durable-ledger-test-secret-000000' });
  const action = manifest();
  const receipt = authority.issue(action, { approved: true, actor: 'owner', source: 'test', issuedAt: fixedNow.toISOString() });
  assert.equal(ledger.consumeApproval(receipt, action, authority, { now: new Date('2026-11-13T10:01:01.000Z') }).valid, false);
  assert.equal(ledger.events().length, 0);
  assert.throws(() => ledger.transition('approval', action.nonce, 'rejected'), /illegal-ledger-transition/);
});

test('ledger corruption fails closed instead of silently dropping events', (t) => {
  const directory = tempDir(t);
  const ledger = new DurableActionLedger({ directory, projectId: 'project-a', taskId: 'task-1' });
  ledger.transition('run', 'nonce-1', 'prepared', { manifestHash: 'sha256:one' });
  fs.appendFileSync(ledger.filePath, '{partial');
  assert.throws(() => new DurableActionLedger({ directory, projectId: 'project-a', taskId: 'task-1' }), /ledger-corrupt/);
});

test('stable effect keys omit payload while the ledger rejects payload changes under the same key', (t) => {
  const directory = tempDir(t);
  const ledger = new DurableActionLedger({ directory, projectId: 'project-a', taskId: 'task-1' });
  const key1 = createStableEffectKey({ projectId: 'project-a', taskId: 'task-1', actionId: 'action-1' });
  const key2 = createStableEffectKey({ projectId: 'project-a', taskId: 'task-1', actionId: 'action-1' });
  assert.equal(key1, key2);
  ledger.transition('effect', key1, 'prepared', { payloadHash: 'sha256:first', beforeHash: null });
  assert.throws(() => ledger.transition('effect', key1, 'prepared', { payloadHash: 'sha256:changed', beforeHash: null }), /ledger-idempotency-payload-mismatch/);
});

