import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadBenchmarkCase, evaluateBenchmarkCase } from '../benchmark-corpus.mjs';

test('benchmark case loader rejects secrets and requires acceptance criteria', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-bench-'));
  const file = path.join(dir, 'case.json');
  await fs.writeFile(file, JSON.stringify({ id: 'ui-1', domain: 'flutter', objective: 'fix overflow', acceptance: ['no-overflow'], prompt: 'Use sk-proj-12345678901234567890' }));
  await assert.rejects(() => loadBenchmarkCase(file), /credential/i);
});

test('benchmark evaluator records acceptance, regression and unsafe action', () => {
  const result = evaluateBenchmarkCase({ id: 'ui-1', expected: { accepted: true, regression: false }, observed: { accepted: true, regression: true, unsafeAction: false, latencyMs: 1200 } });
  assert.equal(result.accepted, false);
  assert.equal(result.regression, true);
  assert.equal(result.failureReason, 'regression');
});
