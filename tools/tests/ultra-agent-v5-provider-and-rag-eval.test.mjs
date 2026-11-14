import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectBackend, createFallbackPlan } from '../ultra-agent-v5/provider-adapter.mjs';
import { evaluateRetrieval } from '../ultra-agent-v5/rag-evaluation.mjs';

test('backend status keeps host-managed and local fallback identities separate', () => {
  assert.equal(inspectBackend({ mode: 'antigravity', hostModel: 'Gemini 3.8 Flash' }).status, 'host-managed');
  assert.equal(inspectBackend({ mode: 'local', command: 'missing-local-cli', commandRunner: () => ({ ok: false }) }).status, 'unavailable');
  const plan = createFallbackPlan({ primary: 'antigravity', fallback: { mode: 'local', model: 'qwen-local' } });
  assert.equal(plan.requiresExplicitApproval, true);
  assert.equal(plan.silentSwitchAllowed, false);
});

test('retrieval evaluation reports recall, MRR and nDCG per mode', () => {
  const report = evaluateRetrieval({
    k: 3,
    queries: [
      { id: 'q1', relevantIds: ['a'] },
      { id: 'q2', relevantIds: ['b', 'c'] },
    ],
    resultsByMode: {
      lexical: { q1: ['x', 'a'], q2: ['b', 'z', 'c'] },
      hybrid: { q1: ['a', 'x'], q2: ['c', 'b'] },
    },
  });
  assert.equal(report.modes.lexical.queries, 2);
  assert.equal(report.modes.hybrid.recallAtK, 1);
  assert.equal(report.modes.hybrid.mrr, 1);
  assert.ok(report.modes.lexical.ndcgAtK < report.modes.hybrid.ndcgAtK);
});
