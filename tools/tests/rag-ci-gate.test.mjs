import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRagCiConfig } from '../rag-ci-gate.mjs';

test('RAG CI requires the dedicated database and credentials', () => {
  assert.throws(() => validateRagCiConfig({ RAG_DB_NAME: 'mansoor_agent_rag', PGPASSWORD: 'x' }), /dedicated/);
  assert.throws(() => validateRagCiConfig({ RAG_DB_NAME: 'mansoor_agent_rag_test' }), /password/);
  assert.doesNotThrow(() => validateRagCiConfig({ RAG_DB_NAME: 'mansoor_agent_rag_test', PGPASSWORD: 'x' }));
});
