import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateMemoryEvidence } from '../ultra-agent-v5/rag-evaluation.mjs';

const fact = (overrides = {}) => ({
  id: 'FACT-1',
  projectId: 'project-a',
  contractVersion: '42',
  status: 'verified',
  sourceRefs: ['src/app.js:1-4'],
  contentHash: 'sha256:abc',
  verifiedAt: '2026-11-13T00:00:00.000Z',
  ...overrides,
});

test('memory evidence passes only for verified, project-scoped, cited facts', () => {
  const result = evaluateMemoryEvidence({ projectId: 'project-a', contractVersion: '42', facts: [fact()] });
  assert.equal(result.allPassed, true);
  assert.equal(result.verified, 1);
  assert.deepEqual(result.blockers, []);
});

test('memory evidence rejects project leakage, missing provenance and stale facts', () => {
  const result = evaluateMemoryEvidence({
    projectId: 'project-a', contractVersion: '42', now: new Date('2026-11-20T00:00:00.000Z'), maxAgeMs: 24 * 60 * 60 * 1000,
    facts: [fact({ id: 'LEAK', projectId: 'project-b' }), fact({ id: 'NOCITE', sourceRefs: [] }), fact({ id: 'STALE', verifiedAt: '2026-11-01T00:00:00.000Z' })],
  });
  assert.equal(result.allPassed, false);
  assert.ok(result.blockers.some((item) => item.includes('project-mismatch')));
  assert.ok(result.blockers.some((item) => item.includes('source-provenance-missing')));
  assert.ok(result.blockers.some((item) => item.includes('stale')));
});

