import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const runtime = path.join(root, 'tools', 'ultra-agent-v3');

async function run(script, args) {
  const { stdout } = await execFileAsync(process.execPath, [path.join(runtime, script), ...args], { encoding: 'utf8' });
  return JSON.parse(stdout);
}

test('policy allows local reads but gates delegation, destructive and external actions', async () => {
  assert.equal((await run('policy.mjs', ['--role', 'node-backend-specialist', '--action', 'read-project'])).allowed, true);
  assert.equal((await run('policy.mjs', ['--role', 'node-backend-specialist', '--action', 'invoke-subagent'])).allowed, false);
  assert.equal((await run('policy.mjs', ['--role', 'production-orchestrator', '--action', 'invoke-subagent'])).allowed, true);
  const destructive = await run('policy.mjs', ['--role', 'production-orchestrator', '--action', 'run-command', '--command', 'git reset --hard']);
  assert.equal(destructive.allowed, false);
  assert.equal(destructive.requiresApproval, true);
  const push = await run('policy.mjs', ['--role', 'production-orchestrator', '--action', 'git-push']);
  assert.equal(push.allowed, false);
  assert.equal(push.requiresApproval, true);
  assert.equal((await run('policy.mjs', ['--role', 'production-orchestrator', '--action', 'git-push', '--approved'])).allowed, true);
});

test('only the manager can delegate and image generation stays with the UI specialist', async () => {
  const profilesRoot = path.join(root, 'agents', 'Antigravity', 'custom-agents');
  const folders = await readdir(profilesRoot, { withFileTypes: true });
  for (const folder of folders.filter((entry) => entry.isDirectory())) {
    const file = path.join(profilesRoot, folder.name, 'agent.md');
    let text;
    try { text = await readFile(file, 'utf8'); } catch { continue; }
    if (folder.name === 'production-orchestrator') assert.match(text, /^\s*- invoke_subagent\s*$/m);
    else assert.doesNotMatch(text, /^\s*- invoke_subagent\s*$/m, folder.name);
  }
  const manager = await readFile(path.join(profilesRoot, 'production-orchestrator', 'agent.md'), 'utf8');
  const ui = await readFile(path.join(profilesRoot, 'mansoor-ui-specialist', 'agent.md'), 'utf8');
  assert.doesNotMatch(manager, /^\s*- generate_image\s*$/m);
  assert.match(ui, /^\s*- generate_image\s*$/m);
});

test('activity records validated redacted worker events and formats concise updates', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-activity-'));
  try {
    const common = ['--dir', fixture, '--project', 'Activity Fixture', '--task', 'task-1', '--worker', 'ui-1', '--role', 'mansoor-ui-specialist'];
    const assignment = await run('activity.mjs', ['append', ...common, '--type', 'assignment', '--scope', 'Update settings UI', '--deliverable', 'Patch plus checks']);
    assert.match(assignment.parentUpdate, /mansoor-ui-specialist.*Update settings UI.*Patch plus checks/i);
    await run('activity.mjs', ['append', ...common, '--type', 'started', '--scope', 'Update settings UI']);
    await run('activity.mjs', ['append', ...common, '--type', 'milestone', '--scope', 'Update settings UI', '--details', 'token=secret-value layout complete']);
    const ledger = await readFile(path.join(fixture, '.agents', 'ultra-v4', 'activity', 'task-1.jsonl'), 'utf8');
    const records = ledger.trim().split(/\r?\n/).map(JSON.parse);
    assert.deepEqual(records.map((record) => record.type), ['assignment', 'started', 'milestone']);
    assert.ok(records.every((record) => record.projectId === assignment.record.projectId));
    assert.match(ledger, /REDACTED_SECRET/);
    assert.doesNotMatch(ledger, /secret-value/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('concurrent activity appends remain valid JSONL', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-activity-concurrent-'));
  try {
    const common = ['--dir', fixture, '--project', 'Concurrent Fixture', '--task', 'task-2', '--worker', 'worker-1', '--role', 'qa-release-specialist', '--scope', 'Run checks'];
    await run('activity.mjs', ['append', ...common, '--type', 'assignment', '--deliverable', 'Evidence']);
    await run('activity.mjs', ['append', ...common, '--type', 'started']);
    await Promise.all(Array.from({ length: 8 }, (_, index) => run('activity.mjs', ['append', ...common, '--type', 'milestone', '--details', `check-${index}`])));
    const ledger = await readFile(path.join(fixture, '.agents', 'ultra-v4', 'activity', 'task-2.jsonl'), 'utf8');
    const records = ledger.trim().split(/\r?\n/).map(JSON.parse);
    assert.equal(records.length, 10);
    assert.equal(records.filter((record) => record.type === 'milestone').length, 8);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('activity summary builds a deterministic native parent timeline', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-activity-summary-'));
  try {
    const ui = ['--dir', fixture, '--project', 'Summary Fixture', '--task', 'task-3', '--worker', 'ui-1', '--role', 'mansoor-ui-specialist'];
    const qa = ['--dir', fixture, '--project', 'Summary Fixture', '--task', 'task-3', '--worker', 'qa-1', '--role', 'qa-release-specialist'];
    await run('activity.mjs', ['append', ...ui, '--type', 'assignment', '--scope', 'Build UI', '--deliverable', 'UI patch']);
    await run('activity.mjs', ['append', ...ui, '--type', 'started']);
    await run('activity.mjs', ['append', ...ui, '--type', 'blocked', '--details', 'waiting for fixture']);
    await run('activity.mjs', ['append', ...qa, '--type', 'assignment', '--scope', 'Run QA', '--deliverable', 'QA report']);
    await run('activity.mjs', ['append', ...qa, '--type', 'started']);
    await run('activity.mjs', ['append', ...qa, '--type', 'completed', '--details', 'all checks passed', '--checks', 'npm test']);
    const summary = await run('activity.mjs', ['summary', '--dir', fixture, '--project', 'Summary Fixture', '--task', 'task-3']);
    assert.deepEqual(summary.workers.map((worker) => worker.workerId), ['qa-1', 'ui-1']);
    assert.equal(summary.workers.find((worker) => worker.workerId === 'ui-1').latestState, 'blocked');
    assert.equal(summary.workers.find((worker) => worker.workerId === 'qa-1').latestState, 'completed');
    assert.deepEqual(summary.blockers, [{ workerId: 'ui-1', details: 'waiting for fixture' }]);
    assert.match(summary.parentUpdate, /2 workers.*1 blocked.*1 completed/i);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('activity summary uses the directory project fallback when project is omitted', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-activity-fallback-'));
  try {
    const common = ['--dir', fixture, '--task', 'task-4', '--worker', 'worker-1', '--role', 'qa-release-specialist'];
    await run('activity.mjs', ['append', ...common, '--type', 'assignment', '--scope', 'Run checks', '--deliverable', 'Evidence']);
    const summary = await run('activity.mjs', ['summary', '--dir', fixture, '--task', 'task-4']);
    assert.equal(summary.workers.length, 1);
    assert.equal(summary.workers[0].workerId, 'worker-1');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
