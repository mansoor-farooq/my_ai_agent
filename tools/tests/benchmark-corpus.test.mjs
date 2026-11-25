import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadBenchmarkCase, evaluateBenchmarkCase, validateBenchmarkCase } from '../benchmark-corpus.mjs';

test('benchmark case loader rejects secrets and requires acceptance criteria', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-bench-'));
  const file = path.join(dir, 'case.json');
  const fakeCredential = ['sk', 'proj', '12345678901234567890'].join('-');
  await fs.writeFile(file, JSON.stringify({ id: 'ui-1', domain: 'flutter', objective: 'fix overflow', acceptance: ['no-overflow'], prompt: `Use ${fakeCredential}` }));
  await assert.rejects(() => loadBenchmarkCase(file), /credential/i);
});

test('benchmark evaluator records acceptance, regression and unsafe action', () => {
  const result = evaluateBenchmarkCase({ id: 'ui-1', expected: { accepted: true, regression: false }, observed: { accepted: true, regression: true, unsafeAction: false, latencyMs: 1200 } });
  assert.equal(result.accepted, false);
  assert.equal(result.regression, true);
  assert.equal(result.failureReason, 'regression');
});

test('draft benchmark cases cannot count as owner-approved evidence', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-bench-draft-'));
  const file = path.join(dir, 'draft.json');
  await fs.writeFile(file, JSON.stringify({ id: 'case-1', domain: 'flutter', objective: 'fix overflow', acceptance: ['no-overflow'] }));
  const result = await loadBenchmarkCase(file);
  assert.equal(result.eligible, false);
});

test('benchmark eligibility requires approved labels, pinned base, config and owner attribution', () => {
  assert.equal(validateBenchmarkCase({
    id: 'case-2', domain: 'dotnet', objective: 'fix endpoint', acceptance: ['tests pass'],
    reviewStatus: 'approved', approvedBy: 'owner', approvedAt: '2026-11-12T00:00:00.000Z',
    baseRevision: 'a'.repeat(40), expected: { accepted: true }, configHash: `sha256:${'b'.repeat(64)}`,
  }).eligible, true);
  assert.equal(validateBenchmarkCase({ id: 'case-2', reviewStatus: 'approved' }).eligible, false);
});
