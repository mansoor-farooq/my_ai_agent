import test from 'node:test';
import assert from 'node:assert/strict';
import { createApprovalAuthority, createActionManifest } from '../ultra-agent-v5/action-manifest.mjs';
import { createApprovalBroker, classifyRisk } from '../ultra-agent-v5/approval-broker.mjs';

const task = (overrides = {}) => ({
  projectId: 'PRJ-001',
  taskId: 'TASK-001',
  projectDir: process.cwd(),
  objective: 'Update the bounded application task',
  scope: ['src/**'],
  acceptance: ['tests_pass'],
  forbiddenPaths: ['.env*', '.git/**', 'requirements/**'],
  ...overrides,
});

const plan = (overrides = {}) => ({
  steps: ['implement the approved change'],
  affectedPaths: ['src/app.js'],
  checks: [{ id: 'unit', tool: process.execPath, args: ['--version'], cwd: process.cwd() }],
  rollback: 'restore the worktree checkpoint',
  ...overrides,
});

function manifestFor({ task: taskOverrides = {}, plan: planOverrides = {}, actions = [{ type: 'write', path: 'src/app.js', content: 'ok' }] } = {}) {
  const inputTask = task(taskOverrides);
  const inputPlan = plan(planOverrides);
  return createActionManifest({
    task: inputTask,
    plan: inputPlan,
    actions,
    workspace: {
      workspaceId: 'WS-001',
      repoRoot: process.cwd(),
      workspaceDir: process.cwd(),
      baseRevision: 'abc123',
    },
    policy: { version: 'test-policy/v1', registryHash: 'sha256:test', ruleIds: ['rule.test'] },
  });
}

test('classifies routine local work as Tier 0 manager auto-approval', () => {
  const result = classifyRisk({ task: task(), plan: plan(), actions: [{ type: 'write', path: 'src/app.js' }] });
  assert.equal(result.riskTier, 0);
  assert.equal(result.decision, 'auto_approve');
  assert.equal(result.requiresOwner, false);
});

test('classifies reversible branch or test publication for manager auto approval', () => {
  const result = classifyRisk({ task: task({ taskType: 'draft-pr' }), plan: plan(), actions: [] });
  assert.equal(result.riskTier, 0);
  assert.equal(result.decision, 'auto_approve');
  assert.equal(result.managerCanApprove, true);
});

test('manager approves non-delete dependency work under approved plan policy', () => {
  const result = classifyRisk({ task: task({ taskType: 'dependency-update' }), plan: plan({ allowedNetwork: ['registry.npmjs.org'] }), actions: [] });
  assert.equal(result.decision, 'auto_approve');
  assert.equal(result.requiresOwner, false);
});

test('non-delete network action is manager-approved with or without a host allowlist', () => {
  const input = { task: task({ taskType: 'dependency-update' }), plan: plan({ allowedNetwork: ['registry.npmjs.org'] }), actions: [] };
  const blocked = createApprovalBroker().evaluate(input);
  assert.equal(blocked.decision, 'auto_approve');
  const allowed = createApprovalBroker({ allowlistedNetwork: ['registry.npmjs.org'], autoApproveTier2: true }).evaluate(input);
  assert.equal(allowed.decision, 'auto_approve');
  assert.equal(allowed.requiresOwner, false);
});

test('non-delete side effects are manager-approved under the approved plan', () => {
  for (const taskType of ['production-deploy', 'secret-rotation', 'database-migration', 'git-push', 'send-message']) {
    const result = classifyRisk({ task: task({ taskType }), plan: plan(), actions: [] });
    assert.equal(result.decision, 'auto_approve', taskType);
    assert.equal(result.managerCanApprove, true, taskType);
  }
});

test('delete, format, truncate and disk wipe actions still require owner approval', () => {
  for (const command of ['Remove-Item data', 'Format-Volume -DriveLetter D', 'TRUNCATE TABLE orders', 'Clear-Disk -Number 1']) {
    const result = classifyRisk({ task: task(), plan: plan(), actions: [{ type: 'command', command }] });
    assert.equal(result.requiresOwner, true, command);
  }
});

test('manager auto-approval issues an exact manifest-bound receipt for routine work', () => {
  const manifest = manifestFor();
  const authority = createApprovalAuthority({ secret: Buffer.from('manager-approval-test-key-material-32') });
  const broker = createApprovalBroker();
  return broker.authorize(manifest, authority, { task: task(), plan: plan(), actions: [{ type: 'write', path: 'src/app.js' }] }).then((result) => {
    assert.equal(result.status, 'approved');
    assert.equal(result.receipt.actor, 'mansoor-ai-team-manager');
    assert.equal(result.receipt.source, 'manager-policy-auto-approval');
    assert.equal(result.receipt.manifestHash, manifest.manifestHash);
    assert.equal(authority.verify(result.receipt, manifest).valid, true);
  });
});

test('destructive action never receives manager self approval', async () => {
  const manifest = manifestFor({ task: { taskType: 'delete', objective: 'Delete one file' } });
  const authority = createApprovalAuthority({ secret: Buffer.from('manager-approval-test-key-material-32') });
  const broker = createApprovalBroker();
  const result = await broker.authorize(manifest, authority, { task: task({ taskType: 'delete', objective: 'Delete one file' }), plan: plan(), actions: [] });
  assert.equal(result.status, 'owner-approval-required');
  assert.equal(result.receipt, undefined);
  assert.equal(result.decision.requiresOwner, true);
});

test('owner approval callback can authorize a destructive manifest with explicit provenance', async () => {
  const manifest = manifestFor({ task: { taskType: 'delete', objective: 'Delete one file' } });
  const authority = createApprovalAuthority({ secret: Buffer.from('manager-approval-test-key-material-32') });
  const broker = createApprovalBroker();
  const result = await broker.authorize(manifest, authority, {
    task: task({ taskType: 'delete', objective: 'Delete one file' }),
    plan: plan(),
    actions: [],
    ownerApprove: async (exactManifest, decision) => authority.issue(exactManifest, { ...decision, approved: true, actor: 'owner', source: 'owner-review' }),
  });
  assert.equal(result.status, 'approved');
  assert.equal(result.receipt.actor, 'owner');
  assert.equal(result.receipt.source, 'owner-review');
});

test('unknown non-delete task type may proceed when scope and plan are valid', () => {
  const result = classifyRisk({ task: task({ taskType: 'something-new-and-unknown' }), plan: plan({ steps: [] }), actions: [] });
  assert.equal(result.decision, 'auto_approve');
  assert.equal(result.requiresOwner, false);
});
