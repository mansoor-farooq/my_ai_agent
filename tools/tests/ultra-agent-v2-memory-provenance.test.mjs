import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { appendMemoryFact, supersedeMemoryFact, formatMemoryCitation } from '../ultra-agent-v2/memory-provenance.mjs';

test('memory facts require project provenance and produce citations', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-memory-'));
  const fact = await appendMemoryFact({ dir, projectId: 'PRJ-1', subject: 'api', claim: 'uses REST', sourceRefs: ['src/api.ts:1-8'], revision: 'abc123', confidence: 'observed' });
  assert.equal(fact.status, 'active');
  assert.match(formatMemoryCitation(fact), /api.*src\/api\.ts:1-8.*abc123/i);
});

test('memory facts can only be superseded by a new version and old facts remain', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-memory-'));
  const oldFact = await appendMemoryFact({ dir, projectId: 'PRJ-1', subject: 'api', claim: 'uses REST', sourceRefs: ['a.ts:1'], revision: 'a' });
  const next = await supersedeMemoryFact(oldFact.id, { dir, projectId: 'PRJ-1', subject: 'api', claim: 'uses GraphQL', sourceRefs: ['b.ts:1'], revision: 'b' });
  assert.equal(next.supersedes, oldFact.id);
  const lines = (await fs.readFile(path.join(dir, '.agents', 'memory', 'facts.jsonl'), 'utf8')).trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].status, 'superseded');
});

test('missing source references are rejected', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-memory-'));
  await assert.rejects(() => appendMemoryFact({ dir, projectId: 'PRJ-1', subject: 'api', claim: 'unknown', sourceRefs: [] }), /sourceRefs/i);
});
