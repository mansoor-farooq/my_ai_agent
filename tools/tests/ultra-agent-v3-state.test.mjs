import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFile, access, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const script = path.join(root, 'tools', 'ultra-agent-v3', 'state.mjs');

function run(action, dir, extra = []) {
  return JSON.parse(execFileSync(process.execPath, [script, action, '--dir', dir, '--task', 'task-001', '--project', 'State Fixture', ...extra], { encoding: 'utf8' }));
}

test('starts a project-scoped task in INTAKE with a stable identity', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-state-'));
  try {
    const result = run('start', fixture);
    assert.equal(result.ok, true);
    assert.equal(result.state, 'INTAKE');
    assert.equal(result.taskId, 'task-001');
    assert.match(result.projectId, /^[a-f0-9]{8}$/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('accepts legal lifecycle transitions and rejects an illegal jump', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-state-'));
  try {
    run('start', fixture);
    for (const state of ['PREFLIGHT', 'CONTEXT', 'MODE', 'PLAN']) {
      const result = run('transition', fixture, ['--to', state]);
      assert.equal(result.state, state);
    }
    assert.throws(
      () => run('transition', fixture, ['--to', 'COMPLETE']),
      /Illegal state transition/,
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('creates a checkpoint and resumes after a corrupted trailing event', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-state-'));
  try {
    run('start', fixture);
    run('transition', fixture, ['--to', 'PREFLIGHT']);
    const checkpoint = run('checkpoint', fixture, ['--label', 'after-preflight']);
    assert.equal(checkpoint.state, 'PREFLIGHT');
    await access(checkpoint.checkpointPath);

    const eventsPath = path.join(fixture, '.agents', 'ultra-v3', 'tasks', 'task-001', 'events.jsonl');
    await appendFile(eventsPath, '{not-json}\n', 'utf8');
    const resumed = run('resume', fixture);
    assert.equal(resumed.state, 'PREFLIGHT');
    assert.equal(resumed.recoveredCorruptTail, true);

    const snapshot = JSON.parse(await readFile(path.join(fixture, '.agents', 'ultra-v3', 'tasks', 'task-001', 'state.json'), 'utf8'));
    assert.equal(snapshot.state, 'PREFLIGHT');
    assert.equal(snapshot.taskId, 'task-001');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
