import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildTrainingPack, redactTrainingText } from '../agent-training-dataset.mjs';
import { recordTaskMetric, recordTaskReview } from '../ultra-agent-v4/benchmark.mjs';

test('training export redacts credentials and local absolute paths', () => {
  const value = redactTrainingText(['to', 'ken=abc12345678901234567890 at C:\\Users\\Mansoor\\secret.txt'].join(''));
  assert.match(value, /REDACTED_SECRET/);
  assert.doesNotMatch(value, /C:\\Users\\Mansoor/);
});

test('training pack keeps approved successes for SFT and hard failures for evaluation', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-training-'));
  const metrics = path.join(root, '.agents', 'ultra-v4', 'metrics');
  const traces = path.join(root, '.agents', 'ultra-v3', 'traces');
  await fs.mkdir(metrics, { recursive: true });
  await fs.mkdir(traces, { recursive: true });
  await fs.writeFile(path.join(metrics, 'tasks.jsonl'), [
    JSON.stringify({ schemaVersion: 1, taskId: 'ui-1', projectId: 'demo', mode: 'premium', outcome: 'complete', failureCode: null, failureReason: null, responseSummary: 'Changed paths: lib/screens/home.dart\nChecks: flutter-test=pass', durationMs: 1200, acceptanceChecks: ['pass'], reviewStatus: 'approved', approvedBy: 'owner', objective: 'Fix responsive overflow', acceptance: ['no clipping'], domain: 'flutter', challengeType: 'layout-overflow' }),
    JSON.stringify({ schemaVersion: 1, taskId: 'arch-1', projectId: 'demo', mode: 'premium', outcome: 'blocked', failureCode: 'scope-drift', failureReason: 'Inventory became store-based', durationMs: 3100, acceptanceChecks: ['fail'], reviewStatus: 'approved', approvedBy: 'owner', objective: 'Preserve inventory domain', acceptance: ['no store drift'], domain: 'architecture', challengeType: 'domain-drift' }),
  ].join('\n') + '\n');
  await fs.writeFile(path.join(traces, 'ui-1.jsonl'), `${JSON.stringify({ taskId: 'ui-1', projectId: 'demo', kind: 'trace-finish', status: 'completed', details: 'Verified with flutter analyze' })}\n`);
  const output = path.join(root, 'out');
  const result = await buildTrainingPack({ projectDir: root, outputDir: output, projectId: 'demo' });
  assert.equal(result.manifest.schema, 'mansoor.agent-training-pack/v1');
  assert.equal(result.manifest.redacted, true);
  assert.equal(result.counts.sft, 1);
  assert.equal(result.counts.evaluation, 2);
  assert.equal(result.counts.hardCases, 2);
  const sft = (await fs.readFile(path.join(output, 'sft.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  const hard = (await fs.readFile(path.join(output, 'hard-cases.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(sft[0].messages[2].role, 'assistant');
  assert.match(sft[0].messages[2].content, /flutter-test=pass/);
  assert.equal(sft[0].metadata.challengeType, 'layout-overflow');
  assert.equal(hard.find((item) => item.failureCode)?.failureCode, 'scope-drift');
});

test('unreviewed outcomes never enter SFT training data', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-training-unreviewed-'));
  const metrics = path.join(root, '.agents', 'ultra-v4', 'metrics');
  await fs.mkdir(metrics, { recursive: true });
  await fs.writeFile(path.join(metrics, 'tasks.jsonl'), `${JSON.stringify({ taskId: 'x', projectId: 'p', outcome: 'complete', durationMs: 1, acceptanceChecks: ['pass'], reviewStatus: 'draft', objective: 'x', acceptance: ['y'] })}\n`);
  const result = await buildTrainingPack({ projectDir: root, outputDir: path.join(root, 'out') });
  assert.equal(result.counts.sft, 0);
  assert.equal(result.counts.evaluation, 1);
});

test('training export creates isolated agent datasets and a Mansoor AI Team Manager aggregate', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-training-agents-'));
  const metrics = path.join(root, '.agents', 'ultra-v4', 'metrics');
  await fs.mkdir(metrics, { recursive: true });
  await fs.writeFile(path.join(metrics, 'tasks.jsonl'), [
    JSON.stringify({ taskId: 'flutter-1', projectId: 'demo', managerId: 'mansoor-ai-team-manager', agentId: 'flutter-mobile-specialist', outcome: 'complete', acceptanceChecks: ['pass'], reviewStatus: 'approved', approvedBy: 'owner', objective: 'Fix mobile layout' }),
    JSON.stringify({ taskId: 'qa-1', projectId: 'demo', managerId: 'mansoor-ai-team-manager', agentId: 'qa-release-specialist', outcome: 'blocked', acceptanceChecks: ['fail'], reviewStatus: 'pending', objective: 'Run release checks' }),
  ].join('\n') + '\n');
  const output = path.join(root, 'datasets');
  const result = await buildTrainingPack({ projectDir: root, outputDir: output, projectId: 'demo' });
  const managerManifest = JSON.parse(await fs.readFile(path.join(output, 'manifest.json'), 'utf8'));
  const flutterManifest = JSON.parse(await fs.readFile(path.join(output, 'agents', 'flutter-mobile-specialist', 'manifest.json'), 'utf8'));
  const qaEval = (await fs.readFile(path.join(output, 'agents', 'qa-release-specialist', 'evaluation.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);

  assert.equal(managerManifest.datasetOwner, 'Mansoor AI Team Manager');
  assert.equal(managerManifest.agentDatasets['flutter-mobile-specialist'].records, 1);
  assert.equal(flutterManifest.datasetOwner, 'flutter-mobile-specialist');
  assert.equal(flutterManifest.files.sft.records, 1);
  assert.equal(qaEval.length, 1);
  assert.equal(qaEval[0].accepted, false);
  assert.equal(result.counts.evaluation, 2);
});

test('owner review is append-only and promotes only the matching passing task into SFT', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-training-review-'));
  const metrics = path.join(root, '.agents', 'ultra-v4', 'metrics');
  await fs.mkdir(metrics, { recursive: true });
  await fs.writeFile(path.join(metrics, 'tasks.jsonl'), `${JSON.stringify({ metricId: 'metric-1', taskId: 'review-me', projectId: 'demo', agentId: 'qa-release-specialist', managerId: 'mansoor-ai-team-manager', outcome: 'complete', acceptanceChecks: ['pass'], reviewStatus: 'pending', objective: 'Verify release checks' })}\n`);
  const review = recordTaskReview({ dir: root, taskId: 'review-me', status: 'approved', approvedBy: 'owner' });
  assert.equal(review.ok, true);
  assert.equal((await fs.readFile(path.join(metrics, 'tasks.jsonl'), 'utf8')).trim().split('\n').length, 1);
  assert.equal((await fs.readFile(path.join(metrics, 'reviews.jsonl'), 'utf8')).trim().split('\n').length, 1);
  assert.throws(() => recordTaskReview({ dir: root, taskId: 'review-me', status: 'approved' }), /approvedBy/);
  const result = await buildTrainingPack({ projectDir: root, outputDir: path.join(root, 'datasets'), projectId: 'demo' });
  assert.equal(result.counts.sft, 1);
  const agentSft = (await fs.readFile(path.join(root, 'datasets', 'agents', 'qa-release-specialist', 'sft.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(agentSft.length, 1);
  assert.equal(agentSft[0].metadata.reviewStatus, 'approved');
});

test('owner approval without a passing verification check never enters SFT', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-training-no-checks-'));
  const metrics = path.join(root, '.agents', 'ultra-v4', 'metrics');
  await fs.mkdir(metrics, { recursive: true });
  await fs.writeFile(path.join(metrics, 'tasks.jsonl'), `${JSON.stringify({ metricId: 'metric-no-checks', taskId: 'no-checks', projectId: 'demo', managerId: 'mansoor-ai-team-manager', outcome: 'complete', acceptanceChecks: [], reviewStatus: 'approved', approvedBy: 'owner', objective: 'Task without verification' })}\n`);
  const result = await buildTrainingPack({ projectDir: root, outputDir: path.join(root, 'datasets'), projectId: 'demo' });
  assert.equal(result.counts.sft, 0);
  assert.equal(result.counts.evaluation, 1);
});

test('managed metric capture normalizes specialist identity and redacts sensitive task text', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-training-capture-'));
  const result = recordTaskMetric({
    dir: root, taskId: 'captured-1', projectId: 'demo', agentId: 'Flutter Mobile Specialist',
    objective: 'Review token=secret-value at C:\\Users\\Person\\private.txt',
    responseSummary: 'Checks pass. <think>private reasoning</think> C:\\Users\\Person\\report.txt',
    startedAt: '2026-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:00:01.000Z',
    outcome: 'complete', acceptanceChecks: ['pass'],
  });
  assert.equal(result.record.managerId, 'mansoor-ai-team-manager');
  assert.equal(result.record.agentId, 'flutter-mobile-specialist');
  assert.match(result.record.objective, /REDACTED_SECRET/);
  assert.doesNotMatch(result.record.objective, /secret-value|C:\\Users/);
  assert.match(result.record.responseSummary, /REDACTED_REASONING/);
  assert.doesNotMatch(result.record.responseSummary, /private reasoning|C:\\Users/);
  assert.equal(result.record.reviewStatus, 'pending');
});
