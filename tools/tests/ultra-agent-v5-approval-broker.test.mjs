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

test('classifies reversible branch or test publication as Tier 1 notification', () => {
  const result = classifyRisk({ task: task({ taskType: 'draft-pr' }), plan: plan(), actions: [] });
  assert.equal(result.riskTier, 1);
  assert.equal(result.decision, 'notify');
  assert.equal(result.managerCanApprove, true);
});

test('classifies sensitive network or dependency work as Tier 2 owner approval by default', () => {
  const result = classifyRisk({ task: task({ taskType: 'dependency-update' }), plan: plan({ allowedNetwork: ['registry.npmjs.org'] }), actions: [] });
  assert.equal(result.riskTier, 2);
  assert.equal(result.decision, 'owner_approval');
  assert.equal(result.requiresOwner, true);
});

test('Tier 2 can be manager-approved only when every declared network host is explicitly allowlisted', () => {
  const input = { task: task({ taskType: 'dependency-update' }), plan: plan({ allowedNetwork: ['registry.npmjs.org'] }), actions: [] };
  const blocked = createApprovalBroker().evaluate(input);
  assert.equal(blocked.decision, 'owner_approval');
  const allowed = createApprovalBroker({ allowlistedNetwork: ['registry.npmjs.org'], autoApproveTier2: true }).evaluate(input);
  assert.equal(allowed.decision, 'auto_approve');
  assert.equal(allowed.requiresOwner, false);
});

test('classifies production, secret, destructive and external side effects as Tier 3', () => {
  for (const taskType of ['production-deploy', 'secret-rotation', 'database-migration', 'git-push', 'send-message']) {
    const result = classifyRisk({ task: task({ taskType }), plan: plan(), actions: [] });
    assert.equal(result.riskTier, 3, taskType);
    assert.equal(result.decision, 'owner_approval', taskType);
    assert.equal(result.managerCanApprove, false, taskType);
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

test('Tier 3 never receives a manager self-approval and waits for owner', async () => {
  const manifest = manifestFor({ task: { taskType: 'production-deploy', objective: 'Deploy to production' } });
  const authority = createApprovalAuthority({ secret: Buffer.from('manager-approval-test-key-material-32') });
  const broker = createApprovalBroker();
  const result = await broker.authorize(manifest, authority, { task: task({ taskType: 'production-deploy', objective: 'Deploy to production' }), plan: plan(), actions: [] });
  assert.equal(result.status, 'owner-approval-required');
  assert.equal(result.receipt, undefined);
  assert.equal(result.decision.requiresOwner, true);
});

test('owner approval callback can authorize a Tier 3 manifest with explicit provenance', async () => {
  const manifest = manifestFor({ task: { taskType: 'production-deploy', objective: 'Deploy to production' } });
  const authority = createApprovalAuthority({ secret: Buffer.from('manager-approval-test-key-material-32') });
  const broker = createApprovalBroker();
  const result = await broker.authorize(manifest, authority, {
    task: task({ taskType: 'production-deploy', objective: 'Deploy to production' }),
    plan: plan(),
    actions: [],
    ownerApprove: async (exactManifest, decision) => authority.issue(exactManifest, { ...decision, approved: true, actor: 'owner', source: 'owner-review' }),
  });
  assert.equal(result.status, 'approved');
  assert.equal(result.receipt.actor, 'owner');
  assert.equal(result.receipt.source, 'owner-review');
});

test('unknown operation fails closed', () => {
  const result = classifyRisk({ task: task({ taskType: 'something-new-and-unknown' }), plan: plan({ steps: [] }), actions: [] });
  assert.equal(result.decision, 'owner_approval');
  assert.equal(result.requiresOwner, true);
  assert.match(result.reasons.join(' '), /unknown|ambiguous/i);
});
