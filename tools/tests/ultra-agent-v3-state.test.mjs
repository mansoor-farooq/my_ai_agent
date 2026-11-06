import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFile, access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const script = path.join(root, 'tools', 'ultra-agent-v3', 'state.mjs');

function run(action, dir, extra = []) {
  return JSON.parse(execFileSync(process.execPath, [script, action, '--dir', dir, '--task', 'task-001', '--project', 'State Fixture', ...extra], { encoding: 'utf8' }));
}
function runAs(action, dir, task, project, extra = []) {
  return JSON.parse(execFileSync(process.execPath, [script, action, '--dir', dir, '--task', task, '--project', project, ...extra], { encoding: 'utf8' }));
}

test('starts a project-scoped task in INTAKE with a stable identity', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-state-'));
  try {
    const result = run('start', fixture);
    assert.equal(result.ok, true);
    assert.equal(result.state, 'INTAKE');
    assert.equal(result.taskId, 'task-001');
    assert.match(result.projectId, /^[a-f0-9]{8}$/);
    const events = (await readFile(path.join(fixture, '.agents', 'ultra-v3', 'tasks', 'task-001', 'events.jsonl'), 'utf8')).trim().split(/\r?\n/).map(JSON.parse);
    assert.equal(events[0].actor, 'antigravity-manager');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('quarantines semantically corrupt events before rewriting a valid state log', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-state-'));
  try {
    run('start', fixture);
    const eventsPath = path.join(fixture, '.agents', 'ultra-v3', 'tasks', 'task-001', 'events.jsonl');
    const invalid = { schemaVersion: 1, eventId: 'bad', recordedAt: new Date().toISOString(), taskId: 'task-001', projectId: 'wrong', previousState: 'INTAKE', nextState: 'NOT_A_STATE' };
    await appendFile(eventsPath, `${JSON.stringify(invalid)}\n`, 'utf8');
    const resumed = run('resume', fixture);
    assert.equal(resumed.state, 'INTAKE');
    assert.equal(resumed.recoveredCorruptTail, true);
    await access(resumed.quarantinePath);
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

test('checkpoint verification detects modified and deleted owned paths without rollback', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-state-drift-'));
  try {
    const source = path.join(fixture, 'src');
    await mkdir(source, { recursive: true });
    await writeFile(path.join(source, 'app.ts'), 'v1\n');
    await writeFile(path.join(source, 'gone.ts'), 'keep\n');
    run('start', fixture);
    const checkpoint = run('checkpoint', fixture, ['--label', 'drift', '--owned-paths', 'src/app.ts,src/gone.ts']);
    await writeFile(path.join(source, 'app.ts'), 'v2\n');
    await rm(path.join(source, 'gone.ts'));
    const verification = run('verify-checkpoint', fixture, ['--checkpoint', checkpoint.checkpointPath]);
    assert.equal(verification.projectId, checkpoint.projectId);
    assert.deepEqual(verification.modifiedPaths, ['src/app.ts']);
    assert.deepEqual(verification.deletedPaths, ['src/gone.ts']);
    assert.deepEqual(verification.unchangedPaths, []);
    assert.equal(verification.rollbackApplied, false);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('checkpoint ignores an in-repo junction that resolves outside the project', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-state-junction-'));
  const external = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-state-external-'));
  try {
    await writeFile(path.join(external, 'secret.txt'), 'outside data\n');
    await symlink(external, path.join(fixture, 'link'), 'junction');
    run('start', fixture);
    const checkpoint = run('checkpoint', fixture, ['--label', 'junction', '--owned-paths', 'link/secret.txt']);
    assert.equal(checkpoint.ownedPaths[0].status, 'outside-root');
    const verification = run('verify-checkpoint', fixture, ['--checkpoint', checkpoint.checkpointPath]);
    assert.deepEqual(verification.outsideRootPaths, ['link/secret.txt']);
    assert.deepEqual(verification.modifiedPaths, []);
  } finally {
    await rm(fixture, { recursive: true, force: true });
    await rm(external, { recursive: true, force: true });
  }
});

test('checkpoint verification rejects a task or project identity mismatch', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-state-identity-'));
  try {
    run('start', fixture);
    const checkpoint = run('checkpoint', fixture, ['--label', 'identity']);
    assert.throws(() => runAs('verify-checkpoint', fixture, 'other-task', 'Other Project', ['--checkpoint', checkpoint.checkpointPath]), /identity mismatch/i);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('checkpoint verification rejects paths outside the project root', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-state-boundary-'));
  try {
    run('start', fixture);
    const checkpoint = run('checkpoint', fixture, ['--label', 'boundary', '--owned-paths', '..\\outside.txt']);
    const verification = run('verify-checkpoint', fixture, ['--checkpoint', checkpoint.checkpointPath]);
    assert.deepEqual(verification.outsideRootPaths, ['../outside.txt']);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
