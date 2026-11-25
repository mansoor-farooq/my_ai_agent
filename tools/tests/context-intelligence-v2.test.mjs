import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  adaptiveContextMode,
  allocateBudget,
  assembleContextBundle,
  commitDigest,
  compactContext,
  detectContextDrift,
  distillToolOutput,
  estimateTokens,
  invalidateModuleDigest,
  moduleDigest,
  recoverOverflow,
  selectNegativeContext,
  recordNegativeContext,
  resolveNegativeContext,
  evaluateDrift,
  guardWorkerOutput,
  createDriftStateStore,
  createContextSchemas,
} from '../ultra-agent-v5/context-intelligence.mjs';
import { buildSymbolIndex, scheduleContextPrewarm, readSemanticLessonCache } from '../ultra-agent-v5/context-intelligence-stretch.mjs';

test('token estimator is deterministic and conservative', () => {
  assert.equal(estimateTokens('abc'), estimateTokens('abc'));
  assert.equal(estimateTokens('a'.repeat(3500)), 1100);
});

test('budget allocation stays under the 85 percent ceiling and reports downshift', () => {
  const budget = allocateBudget('local:qwen', 1000);
  const total = Object.values(budget.buckets).reduce((sum, value) => sum + value, 0);
  assert.ok(total <= 850);
  assert.ok(Array.isArray(budget.truncation_or_resize_reason));
});

test('assembly enforces the effective context ceiling by pruning low-priority payloads', () => {
  const bundle = assembleContextBundle({ runId: 'r1', phase: 'coding', totalWindow: 100, workerScope: { paths: ['src/**'] }, acceptanceCriteria: ['A'], fileDeltas: [{ path: 'src/a.ts', content: 'x'.repeat(5000) }] });
  assert.ok(bundle.context_telemetry.estimated_tokens <= bundle.budget.ceiling_tokens);
  assert.ok(bundle.context_telemetry.truncation_or_resize_reason.length > 0);
});

test('oversized immutable evidence is marked recoverable instead of falsely claiming enforcement', () => {
  const bundle = assembleContextBundle({ totalWindow: 100, acceptanceCriteria: ['A'.repeat(5000)] });
  assert.equal(bundle.status, 'context-overflow-recoverable');
  assert.equal(bundle.context_telemetry.overflow, true);
  assert.match(bundle.context_telemetry.truncation_or_resize_reason.at(-1), /immutable-evidence/);
});

test('adaptive mode splits small local contexts and allows module digests for large contexts', () => {
  assert.deepEqual(adaptiveContextMode(8192), { taskSplit: 'single-module', digestGranularity: 'file' });
  assert.deepEqual(adaptiveContextMode(32768), { taskSplit: 'multi-file', digestGranularity: 'module' });
});

test('module digest is deterministic and invalidation is scoped', () => {
  const digest = moduleDigest({ path: 'src/pos', files: [{ path: 'src/pos/a.ts', content: 'export const a=1;' }], runId: 'r1', verifiedAt: '2026-01-01T00:00:00.000Z' });
  assert.match(digest.content_tree_sha256, /^sha256:/);
  assert.equal(invalidateModuleDigest(digest, { changedPaths: ['src/pos/a.ts'], gitHeadChanged: false, dirty: true }).status, 'stale');
  assert.equal(invalidateModuleDigest(digest, { changedPaths: ['src/accounting/a.ts'], gitHeadChanged: false, dirty: false }).status, 'fresh');
});

test('unverified digest cannot poison shared cache', () => {
  assert.throws(() => commitDigest({ run: { verified: false }, digest: { path: 'src/a' } }), /UnverifiedCacheCommitError/);
  assert.throws(() => commitDigest({ run: { verified: true, runId: 'r1' }, digest: { path: '../escape', content_tree_sha256: 'sha256:bad', verified_run_id: 'r1', status: 'fresh' } }), /DigestIntegrityError/);
  const digest = moduleDigest({ path: 'src/a', files: [{ path: 'src/a.ts', content: 'ok' }], runId: 'r1' });
  assert.equal(commitDigest({ run: { verified: true, runId: 'r1' }, digest }).committed, true);
  assert.throws(() => commitDigest({ run: { verified: true }, digest: { ...digest, verified_run_id: '' } }), /DigestIntegrityError/);
});

test('negative context is selected by scope overlap or blocker signature', () => {
  const entries = [{ failure_id: 'n1', approach_signature: 'old', error_signature: 'TS2304', files_touched: ['src/ui/a.ts'], timestamp: '2026-01-02', run_id: 'r1' }, { failure_id: 'n2', approach_signature: 'other', error_signature: 'EADDRINUSE', files_touched: ['src/api/a.ts'], timestamp: '2026-01-01', run_id: 'r2' }];
  assert.equal(selectNegativeContext(entries, { workerScope: ['src/ui/**'], blockers: ['TS2304'] })[0].failure_id, 'n1');
});

test('context bundle routes phase data and isolates worker paths', () => {
  const bundle = assembleContextBundle({ runId: 'r1', phase: 'coding', workerScope: { role: 'frontend', paths: ['src/ui/**'] }, modelId: 'local:qwen', totalWindow: 8192, acceptanceCriteria: ['UI passes'], blockers: ['none'], projectMap: { paths: ['src/ui/a.ts', 'server/db.sql'] }, fileDeltas: [{ path: 'src/ui/a.ts', content: 'changed' }, { path: 'server/db.sql', content: 'secret=token' }], digests: [{ path: 'src/ui', status: 'fresh', structured_summary: 'UI' }, { path: 'server', status: 'fresh', structured_summary: 'DB' }] });
  assert.equal(bundle.schema, 'mansoor.context-intelligence/v2');
  assert.deepEqual(bundle.active_deltas.map((item) => item.path), ['src/ui/a.ts']);
  assert.equal(bundle.phase, 'coding');
  assert.equal(bundle.security.raw_reasoning_stripped, true);
});

test('compaction preserves immutable anchors verbatim and recovery uses checkpoint', () => {
  const compacted = compactContext({ acceptanceCriteria: ['run npm test'], anchors: [{ path: 'src/a.ts', line: 12, text: 'Error: exact failure', kind: 'error' }], summary: 'old context' });
  assert.equal(compacted.anchors_verified, true);
  assert.equal(compacted.immutable_anchors[0].text, 'Error: exact failure');
  const recovered = recoverOverflow({ effectiveWindow: 100, usedTokens: 200, checkpoint: { acceptanceCriteria: ['A'], topFailureEvidence: ['E'], activeDeltas: ['D'] } });
  assert.deepEqual(recovered.context, { acceptanceCriteria: ['A'], topFailureEvidence: ['E'], activeDeltas: ['D'] });
  assert.throws(() => compactContext({ anchors: [{ path: '../escape', line: -1, text: 'raw chain-of-thought', kind: 'reasoning' }] }), /AnchorIntegrityError/);
});

test('tool-output distiller keeps failure anchors and exit code', () => {
  const raw = ['PASS a', 'FAIL expected 1 got 2', 'at test.js:10', 'PASS b', 'exit code: 1'].join('\n');
  const distilled = distillToolOutput(raw, 'npm test');
  assert.match(distilled.output, /FAIL expected 1 got 2/);
  assert.match(distilled.output, /exit code: 1/);
  assert.doesNotMatch(distilled.output, /PASS a/);
  assert.ok(distilled.report.droppedLines > 0);
});

test('large JSON and logs are bounded with a distillation report', () => {
  const json = JSON.stringify({ items: Array.from({ length: 1000 }, (_, index) => ({ index, value: 'x'.repeat(20) })) });
  const distilled = distillToolOutput(json, 'api-json');
  assert.ok(distilled.output.length < json.length);
  assert.equal(distilled.report.strategy, 'json-summary');
});

test('context drift rejects hallucinated paths and symbols', () => {
  const report = detectContextDrift('Update src/missing.ts and call unknownFunction()', { paths: ['src/real.ts'], symbols: ['knownFunction'] });
  assert.equal(report.drift, true);
  assert.deepEqual(report.unknownPaths, ['src/missing.ts']);
  assert.deepEqual(report.unknownSymbols, ['unknownFunction']);
});

test('frontend worker cannot receive backend paths and secrets are redacted', () => {
  const bundle = assembleContextBundle({ runId: 'r1', phase: 'handoff', workerScope: { role: 'frontend', paths: ['src/ui/**'] }, totalWindow: 8192, acceptanceCriteria: ['A'], fileDeltas: [{ path: 'src/ui/a.ts', content: 'token=secret chain-of-thought: private reasoning' }, { path: 'server/db.sql', content: 'DROP TABLE' }] });
  assert.deepEqual(bundle.active_deltas.map((item) => item.path), ['src/ui/a.ts']);
  assert.doesNotMatch(JSON.stringify(bundle), /token=secret|DROP TABLE|private reasoning/);
});

test('assembly strips hidden reasoning and raw prompt fields at the boundary', () => {
  const bundle = assembleContextBundle({ runId: 'r1', phase: 'planning', projectMap: { architecture: ['src/ui'], reasoning: 'hidden chain', systemPrompt: 'raw prompt' }, decisions: ['safe decision'] });
  assert.doesNotMatch(JSON.stringify(bundle), /hidden chain|raw prompt/);
  assert.doesNotMatch(JSON.stringify(assembleContextBundle({ phase: 'handoff', handoff: { compactionSummary: 'chain-of-thought: private reasoning' } })), /private reasoning/);
});

test('schemas expose versioned round-trip models', () => {
  const schemas = createContextSchemas();
  assert.equal(schemas.ContextBundle.properties.schema.const, 'mansoor.context-intelligence/v2');
  assert.ok(schemas.DriftReport.properties.version);
});

test('negative context persists on disk and successful verification resolves conflicts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'negative-context-'));
  try {
    const entry = recordNegativeContext({ projectDir: root, project: 'demo', runId: 'r1', approachSignature: 'a1', errorSignature: 'E1', filesTouched: ['src/a.ts'] });
    assert.equal(entry.failure_id.length > 0, true);
    const file = path.join(root, '.antigravity', 'cache', 'negative', 'demo.json');
    assert.equal(fs.existsSync(file), true);
    const resolved = resolveNegativeContext({ projectDir: root, project: 'demo', filesTouched: ['src/a.ts'], errorSignature: 'E1' });
    assert.equal(resolved[0].status, 'resolved');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('drift circuit breaker reprompts once and escalates after two breaches', () => {
  const first = evaluateDrift({ workerId: 'w1', report: { drift: true, unknownPaths: ['src/missing.ts'], unknownSymbols: [] }, breachCount: 0 });
  assert.equal(first.action, 'reprompt');
  const second = evaluateDrift({ workerId: 'w1', report: { drift: true, unknownPaths: ['src/missing.ts'], unknownSymbols: [] }, breachCount: 1 });
  assert.equal(second.action, 'escalate-context-unstable');
});

test('drift breach count survives a process-level store recreation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-state-'));
  try {
    const firstStore = createDriftStateStore({ projectDir: root, runId: 'r-durable' });
    assert.equal(evaluateDrift({ runId: 'r-durable', workerId: 'w1', report: { drift: true }, stateStore: firstStore }).action, 'reprompt');
    const secondStore = createDriftStateStore({ projectDir: root, runId: 'r-durable' });
    assert.equal(evaluateDrift({ runId: 'r-durable', workerId: 'w1', report: { drift: true }, stateStore: secondStore }).action, 'escalate-context-unstable');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('worker output gate reprompts drift and refuses unverified output', async () => {
  const accepted = await guardWorkerOutput({ runId: 'r1', workerId: 'w2', output: 'use src/missing.ts', projectMap: { paths: ['src/real.ts'] }, reprompt: async () => 'use src/real.ts' });
  assert.equal(accepted.accepted, true);
  const rejected = await guardWorkerOutput({ runId: 'r2', workerId: 'w3', output: 'use src/missing.ts', projectMap: { paths: ['src/real.ts'] } });
  assert.equal(rejected.accepted, false);
});

test('optional stretch interfaces remain safely disabled', () => {
  assert.equal(buildSymbolIndex().enabled, false);
  assert.equal(scheduleContextPrewarm().scheduled, false);
  assert.equal(readSemanticLessonCache().lessons.length, 0);
});
