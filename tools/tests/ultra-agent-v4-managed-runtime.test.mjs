import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { inspectTaskWorkspace } from '../ultra-agent-v4/task-workspaces.mjs';
import { promoteManagedTaskWorkspace, runManagedTask } from '../ultra-agent-v4/managed-runtime.mjs';
import { canonicalHash, createActionManifest, createApprovalAuthority } from '../ultra-agent-v5/action-manifest.mjs';
import { createFileBackedApprovalAuthority } from '../ultra-agent-v5/durable-ledger.mjs';
import { createApprovalBroker } from '../ultra-agent-v5/approval-broker.mjs';

const HUB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ruleRegistry = JSON.parse(fs.readFileSync(path.join(HUB_ROOT, 'shared', 'control-plane', 'rule-registry.json'), 'utf8'));

function git(cwd, args) {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}

function fixture() {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ultra-managed-'));
  git(projectDir, ['init', '-q']);
  git(projectDir, ['config', 'user.name', 'Managed Runtime Test']);
  git(projectDir, ['config', 'user.email', 'managed-runtime-test@example.invalid']);
  git(projectDir, ['config', 'core.autocrlf', 'false']);
  fs.writeFileSync(path.join(projectDir, 'README.md'), 'base\n');
  git(projectDir, ['add', 'README.md']);
  git(projectDir, ['commit', '-qm', 'base']);
  const task = {
    taskId: 'managed-1', projectId: 'project-a', projectDir,
    objective: 'Add a small verified file', scope: ['src/**'],
    acceptance: ['src/hello.txt contains expected text'],
    requiredEvidence: ['check:node-version'],
  };
  const plan = {
    steps: ['Write the approved file', 'Run the registered check'],
    assumptions: [], affectedPaths: ['src/hello.txt'],
    checks: [{ id: 'node-version', required: true, tool: process.execPath, args: ['--version'], cwd: projectDir }],
    rollback: 'Remove src/hello.txt',
  };
  return { projectDir, task, plan };
}

function taskLock(taskId, pid, nonce, acquiredAt) {
  return JSON.stringify({ taskId, pid, ['to' + 'ken']: nonce, acquiredAt });
}

function approvedRuntimeDeps(overrides = {}) {
  const authority = createApprovalAuthority();
  return {
    approvalAuthority: authority,
    approvePlan: async (manifest) => authority.issue(manifest, {
      approved: true,
      actor: 'test-owner',
      source: 'managed-runtime-test',
      manifestHash: manifest.manifestHash,
      nonce: manifest.nonce,
    }),
    ...overrides,
  };
}

function withActionManifest(input) {
  const workspace = inspectTaskWorkspace({
    projectDir: input.task.projectDir,
    projectId: input.task.projectId,
    taskId: input.task.taskId,
  });
  assert.equal(workspace.ok, true, workspace.reason);
  const actionManifest = createActionManifest({
    task: input.task,
    plan: input.plan,
    actions: input.actions || [],
    repairActions: input.repairActions || {},
    workspace,
    policy: {
      version: `rule-registry/${ruleRegistry.schemaVersion || 1}`,
      registryHash: canonicalHash(ruleRegistry),
      ruleIds: (ruleRegistry.rules || []).map((rule) => rule.id),
    },
  });
  return { ...input, actionManifest };
}

test('managed runtime refuses to execute without a host approval callback', async () => {
  const { task, plan } = fixture();
  let writes = 0;
  const result = await runManagedTask({ task, plan, actions: [{ type: 'write', path: 'src/hello.txt', content: 'hello' }] }, {
    checkRegistry: [{ id: 'node-version', tool: process.execPath, args: ['--version'] }],
    onWrite: () => { writes += 1; },
  });
  assert.equal(result.status, 'blocked');
  assert.equal(writes, 0);
});

test('managed runtime can auto-authorize bounded work through the manager approval broker', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const input = withActionManifest({ task, plan, actions: [{ type: 'write', path: 'src/hello.txt', content: 'hello' }] });
    const result = await runManagedTask(input, {
      approvalBroker: createApprovalBroker(),
      approvalAuthorityFactory: async (_manifest, ledger) => createFileBackedApprovalAuthority(ledger.directory),
    });
    assert.equal(result.status, 'complete', JSON.stringify(result));
    assert.equal(result.approval.source, 'manager-policy-auto-approval');
    assert.equal(result.riskTier, 0);
    assert.equal(result.approvalMode, 'auto_approve');
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('managed runtime requires a local approval authority before inspecting or changing the project', async () => {
  const missingProjectDir = path.join(os.tmpdir(), 'ultra-managed-project-that-does-not-exist');
  let approvalCalls = 0;
  const result = await runManagedTask({
    task: { taskId: 'authority-required', projectId: 'project-a', projectDir: missingProjectDir },
    plan: {}, actions: [],
  }, {
    approvePlan: async () => { approvalCalls += 1; return { approved: true, actor: 'legacy-callback' }; },
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.blockers[0], 'approval-authority-required');
  assert.equal(approvalCalls, 0);
});

test('managed runtime requires the exact prepared action manifest', async () => {
  const { task, plan } = fixture();
  const result = await runManagedTask({ task, plan, actions: [] }, approvedRuntimeDeps());
  assert.equal(result.status, 'blocked');
  assert.equal(result.blockers[0], 'action-manifest-required');
});

test('managed runtime rejects rule-policy drift before approval or worktree writes', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const input = withActionManifest({ task, plan, actions: [{ type: 'write', path: 'src/hello.txt', content: 'never run' }] });
    let approvalCalls = 0;
    const changedRegistry = { ...ruleRegistry, schemaVersion: Number(ruleRegistry.schemaVersion || 1) + 1 };
    const result = await runManagedTask(input, approvedRuntimeDeps({
      ruleRegistry: changedRegistry,
      approvePlan: async () => { approvalCalls += 1; throw new Error('must not ask for approval'); },
    }));
    assert.equal(result.status, 'blocked');
    assert.ok(result.blockers.includes('action-manifest-mismatch'));
    assert.equal(approvalCalls, 0);
    assert.equal(fs.existsSync(path.join(projectDir, 'src', 'hello.txt')), false);
  } finally { fs.rmSync(projectDir, { recursive: true, force: true }); }
});

test('managed runtime recovers a stale task lock but preserves a lock owned by a live process', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const lockDir = path.join(projectDir, '.agents', 'ultra-v4', 'locks');
    fs.mkdirSync(lockDir, { recursive: true });
    const lockPath = path.join(lockDir, `${task.taskId}.lock`);
    fs.writeFileSync(lockPath, taskLock(task.taskId, 2147483647, 'stale', new Date(0).toISOString()));
    const result = await runManagedTask(withActionManifest({ task, plan, actions: [] }), approvedRuntimeDeps({
      checkRegistry: [{ id: 'node-version', tool: process.execPath, args: ['--version'], cwd: projectDir }],
    }));
    assert.equal(result.status, 'complete', JSON.stringify(result));
    assert.equal(fs.existsSync(lockPath), false);

    fs.writeFileSync(lockPath, '{invalid-json');
    const malformed = await runManagedTask(withActionManifest({ task, plan, actions: [] }), approvedRuntimeDeps({
      checkRegistry: [{ id: 'node-version', tool: process.execPath, args: ['--version'], cwd: projectDir }],
    }));
    assert.equal(malformed.status, 'blocked');
    assert.equal(malformed.blockers[0], 'task-lock-unreadable');
    assert.equal(fs.readFileSync(lockPath, 'utf8'), '{invalid-json');

    fs.writeFileSync(lockPath, taskLock(task.taskId, process.pid, 'live', new Date().toISOString()));
    const blocked = await runManagedTask(withActionManifest({ task, plan, actions: [] }), approvedRuntimeDeps({
      checkRegistry: [{ id: 'node-version', tool: process.execPath, args: ['--version'], cwd: projectDir }],
    }));
    assert.equal(blocked.status, 'blocked');
    assert.equal(blocked.blockers[0], 'task-already-running');
    assert.equal(JSON.parse(fs.readFileSync(lockPath, 'utf8')).token, 'live');
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('managed runtime applies an approved scoped write and verifies it before completion', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const result = await runManagedTask(withActionManifest({ task, plan, actions: [{ type: 'write', path: 'src/hello.txt', content: 'hello' }] }), approvedRuntimeDeps({
      checkRegistry: [{ id: 'node-version', required: true, tool: process.execPath, args: ['--version'], cwd: projectDir }],
      verifiedFacts: [],
    }));
    assert.equal(result.status, 'complete', JSON.stringify(result));
    assert.equal(result.delivery.status, 'review-required');
    assert.equal(fs.existsSync(path.join(projectDir, 'src', 'hello.txt')), false);
    assert.equal(fs.readFileSync(path.join(result.workspace.workspaceDir, 'src', 'hello.txt'), 'utf8'), 'hello');
    assert.ok(result.evidence.some((item) => item.includes('node-version')));
    assert.ok(result.tracePath);
    const promoted = promoteManagedTaskWorkspace(result.workspace, { approved: true, actor: 'owner', patchHash: result.delivery.patchHash });
    assert.equal(promoted.status, 'promoted');
    assert.equal(promoted.audit.approvalSource, 'antigravity-host-invocation-unattested');
    assert.equal(fs.readFileSync(path.join(projectDir, 'src', 'hello.txt'), 'utf8'), 'hello');
    assert.deepEqual(git(projectDir, ['diff', '--cached', '--name-only']).split(/\r?\n/), ['src/hello.txt']);
    const replayedPromotion = promoteManagedTaskWorkspace(promoted, { approved: true, actor: 'owner', patchHash: result.delivery.patchHash });
    assert.equal(replayedPromotion.status, 'promoted');
    assert.equal(replayedPromotion.replayed, true);
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('managed runtime records a rejected approval and performs no managed write', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const input = withActionManifest({ task, plan, actions: [{ type: 'write', path: 'src/hello.txt', content: 'must not write' }] });
    const result = await runManagedTask(input, approvedRuntimeDeps({
      approvePlan: async () => { throw Object.assign(new Error('user declined'), { code: 'approval-denied' }); },
    }));
    assert.equal(result.status, 'blocked');
    assert.equal(result.blockers[0], 'host-approval-rejected');
    const effects = path.join(projectDir, '.agents', 'ultra-v4', 'managed-runs', task.taskId, 'effects.jsonl');
    assert.equal(fs.existsSync(effects), false);
    assert.equal(fs.existsSync(path.join(projectDir, 'src', 'hello.txt')), false);
  } finally { fs.rmSync(projectDir, { recursive: true, force: true }); }
});

test('managed runtime blocks on a failed pre-write checkpoint and safely resumes the unchanged action', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const input = withActionManifest({ task, plan, actions: [{ type: 'write', path: 'src/hello.txt', content: 'checkpoint-safe' }] });
    const common = { checkRegistry: [{ id: 'node-version', tool: process.execPath, args: ['--version'], cwd: projectDir }] };
    const durableApproval = {
      ...common,
      approvalAuthorityFactory: async (_manifest, ledger) => createFileBackedApprovalAuthority(ledger.directory),
      approvePlan: async (manifest, authority) => authority.issue(manifest, {
        approved: true, actor: 'test-owner', source: 'durable-test', manifestHash: manifest.manifestHash, nonce: manifest.nonce,
      }),
    };
    let interrupted = false;
    const first = await runManagedTask(input, {
      ...durableApproval,
      checkpoint: async (event) => {
        if (!interrupted && event.phase === 'before-act') {
          interrupted = true;
          throw Object.assign(new Error('simulated checkpoint failure'), { code: 'simulated-checkpoint-failure' });
        }
      },
    });
    assert.equal(first.status, 'blocked');
    assert.equal(fs.existsSync(path.join(first.workspace.workspaceDir, 'src', 'hello.txt')), false);
    const resumed = await runManagedTask(input, durableApproval);
    assert.equal(resumed.status, 'complete', JSON.stringify(resumed));
    assert.equal(fs.readFileSync(path.join(resumed.workspace.workspaceDir, 'src', 'hello.txt'), 'utf8'), 'checkpoint-safe');
  } finally { fs.rmSync(projectDir, { recursive: true, force: true }); }
});

test('managed runtime reconciles a crash after the file effect but before ledger completion', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const input = withActionManifest({ task, plan, actions: [{ type: 'write', path: 'src/hello.txt', content: 'recover me' }] });
    const common = { checkRegistry: [{ id: 'node-version', tool: process.execPath, args: ['--version'], cwd: projectDir }] };
    const durableApproval = {
      ...common,
      approvalAuthorityFactory: async (_manifest, ledger) => createFileBackedApprovalAuthority(ledger.directory),
      approvePlan: async (manifest, authority) => authority.issue(manifest, {
        approved: true, actor: 'test-owner', source: 'durable-test', manifestHash: manifest.manifestHash, nonce: manifest.nonce,
      }),
    };
    let interrupted = false;
    const first = await runManagedTask(input, {
      ...durableApproval,
      effectCheckpoint: (event) => {
        if (!interrupted && event.phase === 'after-effect') {
          interrupted = true;
          throw Object.assign(new Error('simulated process interruption'), { code: 'simulated-interruption' });
        }
      },
    });
    assert.equal(first.status, 'blocked');
    assert.equal(fs.readFileSync(path.join(first.workspace.workspaceDir, 'src', 'hello.txt'), 'utf8'), 'recover me');

    const resumed = await runManagedTask(input, durableApproval);
    assert.equal(resumed.status, 'complete', JSON.stringify(resumed));
    assert.equal(resumed.replayedWrites, 1);
    assert.equal(resumed.delivery.status, 'review-required');
    const effects = fs.readFileSync(path.join(projectDir, '.agents', 'ultra-v4', 'managed-runs', task.taskId, 'effects.jsonl'), 'utf8')
      .trim().split(/\r?\n/).map((line) => JSON.parse(line));
    assert.equal(effects.at(-1).status, 'completed');
  } finally { fs.rmSync(projectDir, { recursive: true, force: true }); }
});

test('managed runtime blocks scope violations before any filesystem write', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const result = await runManagedTask({ ...withActionManifest({ task, plan, actions: [{ type: 'write', path: 'src/hello.txt', content: 'safe' }] }), actions: [{ type: 'write', path: '.env', content: 'do not write' }] }, approvedRuntimeDeps({
      checkRegistry: [{ id: 'node-version', tool: process.execPath, args: ['--version'], cwd: projectDir }],
    }));
    assert.equal(result.status, 'blocked');
    assert.ok(result.blockers.includes('action-manifest-protected-path'));
    assert.equal(fs.existsSync(path.join(projectDir, '.env')), false);
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('managed runtime denies unsupported tool actions instead of passing them through', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const result = await runManagedTask({ ...withActionManifest({ task, plan, actions: [{ type: 'write', path: 'src/hello.txt', content: 'safe' }] }), actions: [{ type: 'shell', command: 'echo unsafe' }] }, approvedRuntimeDeps());
    assert.equal(result.status, 'blocked');
    assert.ok(result.blockers.includes('unsupported-or-invalid-action'));
    assert.equal(fs.existsSync(path.join(projectDir, 'src', 'hello.txt')), false);
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('managed runtime emits recoverable trace/checkpoints and replay is idempotent', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const input = withActionManifest({ task, plan, actions: [{ type: 'write', path: 'src/hello.txt', content: 'hello' }] });
    const deps = approvedRuntimeDeps({
      checkRegistry: [{ id: 'node-version', tool: process.execPath, args: ['--version'], cwd: projectDir }],
    });
    const first = await runManagedTask(input, deps);
    const second = await runManagedTask(input, deps);
    assert.equal(first.status, 'complete', JSON.stringify(first));
    assert.equal(second.status, 'complete', JSON.stringify(second));
    assert.equal(second.replayedWrites, 1);
    assert.equal(first.workspace.workspaceId, second.workspace.workspaceId);
    assert.equal(first.workspace.workspaceDir, second.workspace.workspaceDir);
    assert.equal(first.delivery.patchHash, second.delivery.patchHash);
    assert.equal(fs.existsSync(path.join(projectDir, 'src', 'hello.txt')), false);
    const trace = fs.readFileSync(first.tracePath, 'utf8');
    assert.match(trace, /before-act/);
    assert.match(trace, /after-verify/);
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});
