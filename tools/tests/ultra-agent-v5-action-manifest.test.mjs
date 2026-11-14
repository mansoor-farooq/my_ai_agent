import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { createActionManifest, createApprovalAuthority } from '../ultra-agent-v5/action-manifest.mjs';

const fixedNow = new Date('2026-11-13T10:00:00.000Z');

function input(overrides = {}) {
  return {
    task: {
      projectId: 'project-a', taskId: 'task-1', projectDir: 'C:/work/project-a',
      objective: 'Update one source file', scope: ['src/**'], acceptance: ['expected behavior passes'],
    },
    plan: {
      affectedPaths: ['src/app.mjs'], steps: ['Change one function'], assumptions: [], rollback: 'Revert the patch',
      checks: [{ id: 'unit', tool: 'node', args: ['--test', 'test.mjs'], cwd: 'C:/work/project-a', timeoutMs: 5000, env: { APP_MODE: 'test', API_TOKEN: 'do-not-copy' } }],
      allowedNetwork: ['https://registry.npmjs.org'],
    },
    actions: [{ type: 'write', path: 'src\\app.mjs', content: 'export const value = 1;\n' }],
    workspace: { workspaceId: 'workspace-1', repoRoot: 'C:/work/project-a', workspaceDir: 'C:/work/workspace-1', baseRevision: 'abc123' },
    policy: { version: 'policy/v1', registryHash: 'sha256:rules' },
    ...overrides,
  };
}

function makeManifest(overrides = {}) {
  return createActionManifest(input(overrides), { now: fixedNow, ttlMs: 60_000, nonce: 'nonce-1' });
}

test('action manifest binds exact writes, registered commands, project revision, and policy without raw file or environment secrets', () => {
  const manifest = makeManifest();
  assert.equal(manifest.schema, 'mansoor.action-manifest/v1');
  assert.equal(manifest.actions[0].path, 'src/app.mjs');
  assert.match(manifest.actions[0].contentHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(manifest.actions[0].contentHash, `sha256:${crypto.createHash('sha256').update('export const value = 1;\n').digest('hex')}`);
  assert.equal('content' in manifest.actions[0], false);
  assert.deepEqual(manifest.checks[0].args, ['--test', 'test.mjs']);
  assert.deepEqual(manifest.checks[0].envKeys, ['API_TOKEN', 'APP_MODE']);
  assert.notEqual(manifest.checks[0].envHash, undefined);
  assert.equal(JSON.stringify(manifest).includes('do-not-copy'), false);
  assert.equal(JSON.stringify(manifest).includes('export const value'), false);
  assert.equal(manifest.workspace.baseRevision, 'abc123');
  assert.equal(manifest.policy.registryHash, 'sha256:rules');
  assert.match(manifest.manifestHash, /^sha256:[a-f0-9]{64}$/);
});

test('action manifest hash changes when an approved write payload or command changes', () => {
  const original = makeManifest();
  const changedWrite = makeManifest({ actions: [{ type: 'write', path: 'src\\app.mjs', content: 'export const value = 2;\n' }] });
  const changedCommand = makeManifest({ plan: { ...input().plan, checks: [{ ...input().plan.checks[0], args: ['--version'] }] } });
  assert.notEqual(original.manifestHash, changedWrite.manifestHash);
  assert.notEqual(original.manifestHash, changedCommand.manifestHash);
});

test('action manifest rejects paths outside the plan, task scope, and protected locations', () => {
  assert.throws(() => makeManifest({ actions: [{ type: 'write', path: 'docs/readme.md', content: 'outside' }] }), /outside-task-scope/);
  assert.throws(() => makeManifest({ plan: { ...input().plan, affectedPaths: ['src/other.mjs'] } }), /outside-plan-scope/);
  assert.throws(() => makeManifest({ actions: [{ type: 'write', path: 'src/.env.local', content: 'secret' }] }), /protected-path/);
  assert.throws(() => makeManifest({ actions: [{ type: 'write', path: 'requirements/base.txt', content: 'package' }] }), /protected-path/);
  assert.throws(() => makeManifest({ task: { ...input().task, forbiddenPaths: ['src/app.mjs'] } }), /forbidden-path/);
  assert.throws(() => makeManifest({ task: { ...input().task, forbiddenPaths: 'src/app.mjs' } }), /forbidden-path/);
});

test('action manifest requires at least one mandatory verification check', () => {
  assert.throws(() => makeManifest({ plan: { ...input().plan, checks: [{ ...input().plan.checks[0], required: false }] } }), /required-checks-missing/);
});

test('approval receipt is bound to the action manifest and can be consumed only once', () => {
  const authority = createApprovalAuthority({ secret: ['unit-test', 'secret-that-is-long-enough'].join('-') });
  const manifest = makeManifest();
  const receipt = authority.issue(manifest, { approved: true, actor: 'test-owner', source: 'test-host', issuedAt: fixedNow.toISOString() });
  assert.equal(authority.consume(receipt, manifest, { now: fixedNow }).valid, true);
  assert.deepEqual(authority.consume(receipt, manifest, { now: fixedNow }), { valid: false, reason: 'approval-receipt-replayed' });
});

test('approval receipt rejects a changed manifest, modified receipt, or expired action', () => {
  const authority = createApprovalAuthority({ secret: ['unit-test', 'secret-that-is-long-enough'].join('-') });
  const manifest = makeManifest();
  const receipt = authority.issue(manifest, { approved: true, actor: 'test-owner', source: 'test-host', issuedAt: fixedNow.toISOString() });
  const changedManifest = makeManifest({ actions: [{ type: 'write', path: 'src\\app.mjs', content: 'different' }] });
  assert.equal(authority.verify(receipt, changedManifest, { now: fixedNow }).valid, false);
  assert.equal(authority.verify({ ...receipt, actor: 'forged' }, manifest, { now: fixedNow }).valid, false);
  assert.deepEqual(authority.verify(receipt, manifest, { now: new Date('2026-11-13T10:01:01.000Z') }), { valid: false, reason: 'approval-receipt-expired' });
});

test('approval receipt cannot be issued for an unapproved, mismatched, or expired manifest', () => {
  const authority = createApprovalAuthority({ secret: ['unit-test', 'secret-that-is-long-enough'].join('-') });
  const manifest = makeManifest();
  assert.throws(() => authority.issue(manifest, { approved: false, actor: 'test-owner', source: 'test-host' }), /approval-required/);
  assert.throws(() => authority.issue(manifest, { approved: true, actor: 'test-owner', source: 'test-host', manifestHash: 'sha256:wrong' }), /manifest-mismatch/);
  assert.throws(() => authority.issue(manifest, { approved: true, actor: 'test-owner', source: 'test-host', issuedAt: '2026-11-13T10:02:00.000Z' }), /manifest-expired/);
  assert.throws(() => createActionManifest(input(), { now: fixedNow, ttlMs: 60_000, nonce: '' }), /nonce-invalid/);
});
