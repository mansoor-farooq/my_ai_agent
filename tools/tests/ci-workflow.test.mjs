import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('release workflow has least privilege, pinned actions and required PostgreSQL RAG lane', () => {
  const file = path.resolve(process.cwd(), '.github', 'workflows', 'quality.yml');
  const workflow = fs.readFileSync(file, 'utf8');
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflow, /runs-on:\s*windows-latest/);
  assert.match(workflow, /runs-on:\s*ubuntu-24\.04/);
  assert.match(workflow, /postgres:17/);
  assert.match(workflow, /RAG_DB_NAME:\s*mansoor_agent_rag_test/);
  assert.match(workflow, /npm run test:rag/);
  const actions = [...workflow.matchAll(/uses:\s*([^\s]+)/g)].map((match) => match[1]);
  assert.ok(actions.length > 0);
  assert.ok(actions.every((action) => /@[a-f0-9]{40}$/i.test(action)), JSON.stringify(actions));
});
