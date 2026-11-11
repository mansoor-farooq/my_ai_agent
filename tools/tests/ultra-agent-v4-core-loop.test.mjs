import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runCoreLoop, transition } from '../ultra-agent-v4/core-loop.mjs';
import { actStage, guardWritePath } from '../ultra-agent-v4/stages/act.mjs';
import { rememberStage } from '../ultra-agent-v4/stages/remember.mjs';
import { answerStage } from '../ultra-agent-v4/stages/answer.mjs';
import { runChecks } from '../ultra-agent-v4/stages/verify.mjs';

async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'mansoor-core-loop-'));
  return { dir, task: { taskId: 'task-001', projectId: 'project-001', projectDir: dir, objective: 'Fix the approved change', scope: ['src/**'], acceptance: ['check-pass'], forbidden_paths: ['private/**'] } };
}

function passingDeps(overrides = {}) {
  return {
    planInput: { approved: true, steps: ['implement'], checks: ['check-pass'] },
    actionProvider: () => [{ type: 'write', path: 'src/app.js' }],
    executeAction: async () => ({ changedPaths: ['src/app.js'], evidence: ['EV-1'] }),
    runChecks: async () => ({ schema: 'test', allPassed: true, checks: [{ id: 'check-pass', status: 'pass' }], failedChecks: [], unverifiedChecks: [] }),
    verifiedFacts: ['The approved change passed its required check.'],
    sourceRefs: ['src/app.js:1-2'],
    ...overrides,
  };
}

test('illegal transitions throw', () => {
  assert.throws(() => transition('INTAKE', 'ACT'), /Illegal core-loop transition/);
  assert.deepEqual(transition('INTAKE', 'CONTEXT'), { from: 'INTAKE', to: 'CONTEXT' });
});

for (const [field, label] of [['objective', 'objective'], ['scope', 'scope'], ['acceptance', 'acceptance']]) {
  test(`missing ${label} rejects the task`, async () => {
    const { dir, task } = await fixture();
    try {
      const invalid = { ...task, [field]: field === 'objective' ? '' : [] };
      const result = await runCoreLoop(invalid);
      assert.equal(result.status, 'blocked');
      assert.match(result.blockers.join(','), new RegExp(`${label}-required`));
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
}

test('unapproved plan never enters ACT', async () => {
  const { dir, task } = await fixture();
  let acted = false;
  try {
    const result = await runCoreLoop(task, { planInput: { approved: false }, actionProvider: () => { acted = true; return []; } });
    assert.equal(result.status, 'escalated');
    assert.equal(acted, false);
    assert.ok(result.blockers.includes('plan-not-approved'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('path normalization rejects traversal, absolute, drive and UNC paths', () => {
  const task = { projectDir: process.cwd(), scope: ['src/**'] };
  for (const value of ['../secret.txt', '/tmp/secret.txt', 'C:/secret.txt', '\\\\server\\share\\secret.txt']) {
    assert.equal(guardWritePath(task, value).allowed, false, value);
  }
});

test('symlink escape is rejected', () => {
  const fakeFileSystem = {
    existsSync: () => true,
    lstatSync: () => ({ isSymbolicLink: () => true }),
    realpathSync: (value) => value,
  };
  const result = guardWritePath({ projectDir: process.cwd(), scope: ['src/**'] }, 'src/app.js', { fileSystem: fakeFileSystem });
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'symlink-escape');
});

test('protected paths and paths outside scope are denied', () => {
  const task = { projectDir: process.cwd(), scope: ['src/**'], forbidden_paths: ['private/**'] };
  for (const value of ['.env', '.env.local', '.git/config', 'requirements/REQ.md', 'keys/signing.pem', 'private/data.json', 'docs/readme.md']) {
    const result = guardWritePath(task, value);
    assert.equal(result.allowed, false, value);
  }
});

test('scope violation escalates immediately', async () => {
  const { dir, task } = await fixture();
  let executed = false;
  try {
    const result = await runCoreLoop(task, {
      ...passingDeps(),
      actionProvider: () => [{ type: 'write', path: 'docs/outside.js' }],
      executeAction: async () => { executed = true; return {}; },
    });
    assert.equal(result.status, 'escalated');
    assert.equal(executed, false);
    assert.ok(result.blockers.includes('scope-violation'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('stopSignal escalates without repair', async () => {
  const { dir, task } = await fixture();
  let repairs = 0;
  try {
    const result = await runCoreLoop(task, { ...passingDeps({ runChecks: async () => ({ allPassed: false, failedChecks: ['check-pass'], checks: [] }) }), stopSignal: true, repairAction: async () => { repairs += 1; return {}; } });
    assert.equal(result.status, 'escalated');
    assert.equal(repairs, 0);
    assert.ok(result.blockers.includes('stop-signal'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('three total attempts then escalate', async () => {
  const { dir, task } = await fixture();
  let attempts = 0;
  let repairs = 0;
  try {
    const result = await runCoreLoop(task, {
      ...passingDeps({ runChecks: async () => { attempts += 1; return { allPassed: false, failedChecks: ['check-pass'], checks: [] }; } }),
      repairAction: async ({ attempt }) => { repairs += 1; return { steps: [`repair-${attempt}`] }; },
    });
    assert.equal(result.status, 'escalated');
    assert.equal(attempts, 3);
    assert.equal(repairs, 2);
    assert.ok(result.blockers.includes('attempt-limit'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('successful verification completes and returns evidence', async () => {
  const { dir, task } = await fixture();
  try {
    const result = await runCoreLoop(task, passingDeps());
    assert.equal(result.status, 'complete');
    assert.equal(result.lifecycle, 'COMPLETE');
    assert.deepEqual(result.changes, ['src/app.js']);
    assert.deepEqual(result.evidence, ['EV-1']);
    assert.equal(result.memory.status, 'ready');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('failed verification creates a targeted repair input', async () => {
  const { dir, task } = await fixture();
  let repair;
  try {
    const result = await runCoreLoop(task, {
      ...passingDeps({ runChecks: async () => ({ allPassed: false, failedChecks: ['check-pass'], checks: [] }) }),
      repairAction: async (input) => { repair = input.repair; return {}; },
      stopSignal: ({ attempt }) => attempt === 2,
    });
    assert.equal(result.status, 'escalated');
    assert.equal(repair.failedChecks[0], 'check-pass');
    assert.equal(repair.broadRewriteAllowed, false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkpoint is called for every transition and checkpoint failure blocks execution', async () => {
  const { dir, task } = await fixture();
  const events = [];
  try {
    const result = await runCoreLoop(task, { ...passingDeps(), checkpoint: (event) => { events.push(event); } });
    assert.equal(result.status, 'complete');
    const transitionEvents = events.filter((event) => event.phase === 'before-transition' || event.phase === 'after-transition');
    assert.ok(transitionEvents.length >= 18);
    await assert.rejects(() => runCoreLoop(task, { ...passingDeps(), checkpoint: () => { throw new Error('checkpoint failed'); } }), /checkpoint failed/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('verify runner returns unverified for missing tools and hashes output', async () => {
  const missing = await runChecks([{ id: 'missing', tool: 'mansoor-command-that-does-not-exist', args: [], cwd: process.cwd() }], {});
  assert.equal(missing.allPassed, false);
  assert.equal(missing.checks[0].status, 'unverified');
  const passing = await runChecks([{ id: 'node-pass', tool: process.execPath, args: ['-e', 'process.stdout.write("ok")'], cwd: process.cwd(), timeoutMs: 10000 }], {});
  assert.equal(passing.allPassed, true);
  assert.equal(passing.checks[0].status, 'pass');
  assert.match(passing.checks[0].stdout_hash, /^sha256:/);
  const failing = await runChecks([{ id: 'node-fail', tool: process.execPath, args: ['-e', 'process.stderr.write("bad"); process.exit(2)'], cwd: process.cwd(), timeoutMs: 10000 }], {});
  assert.equal(failing.allPassed, false);
  assert.equal(failing.checks[0].status, 'fail');
  assert.equal(failing.checks[0].exit_code, 2);
});

test('remember rejects unverified facts and answer includes evidence/blockers', () => {
  assert.equal(rememberStage({ verification: { allPassed: false }, facts: ['guess'] }).status, 'skipped');
  const answer = answerStage({ status: 'blocked', facts: ['fact'], evidence: ['EV-1'], blockers: ['scope-violation'], verification: { allPassed: false } });
  assert.equal(answer.status, 'blocked');
  assert.deepEqual(answer.evidence, ['EV-1']);
  assert.deepEqual(answer.blockers, ['scope-violation']);
});

