import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { promoteTaskWorkspace, runManagedTask } from '../ultra-agent-v4/managed-runtime.mjs';

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

test('managed runtime recovers a stale task lock but preserves a lock owned by a live process', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const lockDir = path.join(projectDir, '.agents', 'ultra-v4', 'locks');
    fs.mkdirSync(lockDir, { recursive: true });
    const lockPath = path.join(lockDir, `${task.taskId}.lock`);
    fs.writeFileSync(lockPath, taskLock(task.taskId, 2147483647, 'stale', new Date(0).toISOString()));
    const result = await runManagedTask({ task, plan, actions: [] }, {
      approvePlan: async () => ({ approved: true, actor: 'owner' }),
      checkRegistry: [{ id: 'node-version', tool: process.execPath, args: ['--version'], cwd: projectDir }],
    });
    assert.equal(result.status, 'complete', JSON.stringify(result));
    assert.equal(fs.existsSync(lockPath), false);

    fs.writeFileSync(lockPath, '{invalid-json');
    const malformed = await runManagedTask({ task, plan, actions: [] }, {
      approvePlan: async () => ({ approved: true, actor: 'owner' }),
      checkRegistry: [{ id: 'node-version', tool: process.execPath, args: ['--version'], cwd: projectDir }],
    });
    assert.equal(malformed.status, 'blocked');
    assert.equal(malformed.blockers[0], 'task-lock-unreadable');
    assert.equal(fs.readFileSync(lockPath, 'utf8'), '{invalid-json');

    fs.writeFileSync(lockPath, taskLock(task.taskId, process.pid, 'live', new Date().toISOString()));
    const blocked = await runManagedTask({ task, plan, actions: [] }, {
      approvePlan: async () => ({ approved: true, actor: 'owner' }),
      checkRegistry: [{ id: 'node-version', tool: process.execPath, args: ['--version'], cwd: projectDir }],
    });
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
    const result = await runManagedTask({ task, plan, actions: [{ type: 'write', path: 'src/hello.txt', content: 'hello' }] }, {
      approvePlan: async () => ({ approved: true, actor: 'owner' }),
      checkRegistry: [{ id: 'node-version', required: true, tool: process.execPath, args: ['--version'], cwd: projectDir }],
      verifiedFacts: [],
    });
    assert.equal(result.status, 'complete', JSON.stringify(result));
    assert.equal(result.delivery.status, 'review-required');
    assert.equal(fs.existsSync(path.join(projectDir, 'src', 'hello.txt')), false);
    assert.equal(fs.readFileSync(path.join(result.workspace.workspaceDir, 'src', 'hello.txt'), 'utf8'), 'hello');
    assert.ok(result.evidence.some((item) => item.includes('node-version')));
    assert.ok(result.tracePath);
    const promoted = promoteTaskWorkspace(result.workspace, { approved: true, actor: 'owner', patchHash: result.delivery.patchHash });
    assert.equal(promoted.status, 'promoted');
    assert.equal(fs.readFileSync(path.join(projectDir, 'src', 'hello.txt'), 'utf8'), 'hello');
    assert.deepEqual(git(projectDir, ['diff', '--cached', '--name-only']).split(/\r?\n/), ['src/hello.txt']);
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('managed runtime blocks scope violations before any filesystem write', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const result = await runManagedTask({ task, plan, actions: [{ type: 'write', path: '.env', content: 'do not write' }] }, {
      approvePlan: async () => ({ approved: true, actor: 'owner' }),
      checkRegistry: [{ id: 'node-version', tool: process.execPath, args: ['--version'], cwd: projectDir }],
    });
    assert.equal(result.status, 'escalated');
    assert.ok(result.blockers.includes('scope-violation'));
    assert.equal(fs.existsSync(path.join(projectDir, '.env')), false);
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('managed runtime denies unsupported tool actions instead of passing them through', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const result = await runManagedTask({ task, plan, actions: [{ type: 'shell', command: 'echo unsafe' }] }, {
      approvePlan: async () => ({ approved: true, actor: 'owner' }),
    });
    assert.equal(result.status, 'escalated');
    assert.ok(result.blockers.includes('scope-violation'));
    assert.equal(fs.existsSync(path.join(projectDir, 'src', 'hello.txt')), false);
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('managed runtime emits recoverable trace/checkpoints and replay is idempotent', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const input = { task, plan, actions: [{ type: 'write', path: 'src/hello.txt', content: 'hello' }] };
    const deps = {
      approvePlan: async () => ({ approved: true, actor: 'owner' }),
      checkRegistry: [{ id: 'node-version', tool: process.execPath, args: ['--version'], cwd: projectDir }],
    };
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
