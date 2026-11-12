import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRagTestSummary, validateRagCiConfig, validateRagTestSummary } from '../rag-ci-gate.mjs';

test('RAG CI requires the dedicated database and credentials', () => {
  assert.throws(() => validateRagCiConfig({ RAG_DB_NAME: 'mansoor_agent_rag', PGPASSWORD: 'x' }), /dedicated/);
  assert.throws(() => validateRagCiConfig({ RAG_DB_NAME: 'mansoor_agent_rag_test' }), /password/);
  assert.doesNotThrow(() => validateRagCiConfig({ RAG_DB_NAME: 'mansoor_agent_rag_test', PGPASSWORD: 'x' }));
});

test('RAG CI permits explicitly opted-in localhost trust auth only for localhost', () => {
  assert.throws(() => validateRagCiConfig({ RAG_DB_NAME: 'mansoor_agent_rag_test', RAG_DB_TRUST_AUTH: '1' }), /password/);
  assert.doesNotThrow(() => validateRagCiConfig({ RAG_DB_NAME: 'mansoor_agent_rag_test', RAG_DB_TRUST_AUTH: '1', RAG_DB_HOST: 'localhost' }));
  assert.throws(() => validateRagCiConfig({ RAG_DB_NAME: 'mansoor_agent_rag_test', RAG_DB_TRUST_AUTH: '1', RAG_DB_HOST: 'db.example.com' }), /password/);
});

test('RAG release gate rejects skipped or missing integration tests', () => {
  assert.doesNotThrow(() => validateRagTestSummary({ total: 8, passed: 8, failed: 0, skipped: 0 }, 8));
  assert.throws(() => validateRagTestSummary({ total: 8, passed: 7, failed: 0, skipped: 1 }, 8), /skip/i);
  assert.throws(() => validateRagTestSummary({ total: 7, passed: 7, failed: 0, skipped: 0 }, 8), /expected/i);
});

test('TAP parser reads the full RAG suite summary', () => {
  const tap = '# tests 8\n# pass 8\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
  assert.deepEqual(parseRagTestSummary(tap), { total: 8, passed: 8, failed: 0, skipped: 0 });
});
