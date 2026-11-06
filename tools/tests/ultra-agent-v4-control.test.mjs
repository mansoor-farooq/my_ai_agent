import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateCompletion } from '../ultra-agent-v3/evaluate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const runtime = path.join(root, 'tools', 'ultra-agent-v4');

function run(script, args) {
  const result = spawnSync(process.execPath, [path.join(runtime, script), ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test('benchmark reports observed acceptance accuracy, latency and classified failures', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v4-benchmark-'));
  try {
    run('benchmark.mjs', ['record', '--dir', fixture, '--project-id', 'project-a', '--task', 'task-1', '--mode', 'fast', '--started-at', '2026-01-01T00:00:00.000Z', '--completed-at', '2026-01-01T00:00:00.100Z', '--outcome', 'pass', '--checks', 'pass,pass']);
    run('benchmark.mjs', ['record', '--dir', fixture, '--project-id', 'project-a', '--task', 'task-2', '--mode', 'premium', '--started-at', '2026-01-01T00:00:01.000Z', '--completed-at', '2026-01-01T00:00:01.300Z', '--outcome', 'fail', '--failure-code', 'verification-failed', '--failure-reason', 'token=secret-value', '--checks', 'pass,fail']);
    const summary = run('benchmark.mjs', ['summary', '--dir', fixture, '--project-id', 'project-a']);
    assert.equal(summary.tasks, 2);
    assert.equal(summary.successRate, 0.5);
    assert.equal(summary.acceptancePassRate, 0.75);
    assert.equal(summary.medianLatencyMs, 200);
    assert.equal(summary.p95LatencyMs, 300);
    assert.deepEqual(summary.failuresByCode, { 'verification-failed': 1 });
    const raw = await readFile(path.join(fixture, '.agents', 'ultra-v4', 'metrics', 'tasks.jsonl'), 'utf8');
    assert.match(raw, /REDACTED_SECRET/);
    assert.doesNotMatch(raw, /secret-value/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('evaluation exposes a redacted benchmark envelope without changing acceptance', () => {
  const result = evaluateCompletion({
    taskId: 'task-telemetry', projectId: 'project-a', mode: 'fast', risk: 'low',
    startedAt: '2026-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:00:00.250Z',
    verificationRecords: [{ kind: 'verification', status: 'pass' }],
    commandResults: [{ command: 'npm test', status: 'pass' }],
    changedPaths: ['src/app.ts'],
  });
  assert.equal(result.accepted, true);
  assert.equal(result.benchmarkMetric.taskId, 'task-telemetry');
  assert.equal(result.benchmarkMetric.durationMs, 250);
  assert.equal(result.benchmarkMetric.outcome, 'pass');
  assert.deepEqual(result.benchmarkMetric.acceptanceChecks, ['pass', 'pass']);

  const failed = evaluateCompletion({
    taskId: 'task-failed', projectId: 'project-a', mode: 'fast', risk: 'low',
    startedAt: '2026-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:00:00.100Z',
    verificationRecords: [], commandResults: [{ command: 'npm test', status: 'fail', failureCode: 'verification-failed', reason: 'token=secret-value' }], changedPaths: ['src/app.ts'],
  });
  assert.equal(failed.benchmarkMetric.outcome, 'fail');
  assert.match(failed.benchmarkMetric.failureReason, /REDACTED_SECRET/);
  assert.doesNotMatch(failed.benchmarkMetric.failureReason, /secret-value/);
});

test('recovery retries one targeted verification then stops on repeated signature', () => {
  const first = run('recovery.mjs', ['plan', '--failure-code', 'verification-failed', '--signature', 'same-failure', '--attempt', '1', '--failed-checks', 'unit-test', '--affected-paths', 'src/app.ts']);
  assert.equal(first.retry, true);
  assert.deepEqual(first.checks, ['unit-test']);
  assert.deepEqual(first.affectedPaths, ['src/app.ts']);
  const repeated = run('recovery.mjs', ['plan', '--failure-code', 'verification-failed', '--signature', 'same-failure', '--previous-signature', 'same-failure', '--attempt', '2']);
  assert.equal(repeated.retry, false);
  assert.equal(repeated.stopReason, 'repeated-failure-signature');
});

test('recovery never retries destructive, permission, quota or security failures', () => {
  for (const failureCode of ['destructive-action', 'permission-denied', 'quota-exhausted', 'security-policy']) {
    const result = run('recovery.mjs', ['plan', '--failure-code', failureCode, '--signature', failureCode, '--attempt', '1']);
    assert.equal(result.retry, false, failureCode);
    assert.equal(result.stopReason, failureCode);
  }
});
