import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildTrainingPack, redactTrainingText } from '../agent-training-dataset.mjs';

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
    JSON.stringify({ schemaVersion: 1, taskId: 'ui-1', projectId: 'demo', mode: 'premium', outcome: 'complete', failureCode: null, failureReason: null, durationMs: 1200, acceptanceChecks: ['pass'], reviewStatus: 'approved', approvedBy: 'owner', objective: 'Fix responsive overflow', acceptance: ['no clipping'], domain: 'flutter', challengeType: 'layout-overflow' }),
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
