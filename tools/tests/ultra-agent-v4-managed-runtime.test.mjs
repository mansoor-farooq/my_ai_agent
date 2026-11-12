import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runManagedTask } from '../ultra-agent-v4/managed-runtime.mjs';

function fixture() {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ultra-managed-'));
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

test('managed runtime applies an approved scoped write and verifies it before completion', async () => {
  const { projectDir, task, plan } = fixture();
  try {
    const result = await runManagedTask({ task, plan, actions: [{ type: 'write', path: 'src/hello.txt', content: 'hello' }] }, {
      approvePlan: async () => ({ approved: true, actor: 'owner' }),
      checkRegistry: [{ id: 'node-version', required: true, tool: process.execPath, args: ['--version'], cwd: projectDir }],
      verifiedFacts: [],
    });
    assert.equal(result.status, 'complete', JSON.stringify(result));
    assert.equal(fs.readFileSync(path.join(projectDir, 'src', 'hello.txt'), 'utf8'), 'hello');
    assert.ok(result.evidence.some((item) => item.includes('node-version')));
    assert.ok(result.tracePath);
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
    const trace = fs.readFileSync(first.tracePath, 'utf8');
    assert.match(trace, /before-act/);
    assert.match(trace, /after-verify/);
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});
