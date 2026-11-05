import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildContextPacket } from '../ultra-agent-v3/context.mjs';

async function memoryFixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v3-context-'));
  const memory = path.join(dir, '.agents', 'memory');
  await mkdir(memory, { recursive: true });
  await writeFile(path.join(memory, 'PROJECT_MEMORY.md'), '# Project Memory\n');
  await writeFile(path.join(memory, 'decisions.md'), '# Decisions\n');
  await writeFile(path.join(memory, 'open-questions.md'), '# Open Questions\n');
  return { dir, memory };
}

test('excludes evidence belonging to an unrelated project identity', async () => {
  const fixture = await memoryFixture();
  try {
    const initial = await buildContextPacket({ dir: fixture.dir, project: 'Context Fixture' });
    await writeFile(path.join(fixture.memory, 'verification-ledger.jsonl'), [
      JSON.stringify({ id: 'same', projectId: initial.project.projectId, kind: 'verification', claim: 'same project fact', status: 'pass', recordedAt: '2026-01-01T00:00:00.000Z' }),
      JSON.stringify({ id: 'other', projectId: 'other1234', kind: 'verification', claim: 'unrelated fact', status: 'pass', recordedAt: '2026-01-02T00:00:00.000Z' }),
    ].join('\n') + '\n');
    const packet = await buildContextPacket({ dir: fixture.dir, project: 'Context Fixture' });
    assert.ok(packet.evidenceRefs.includes('same'));
    assert.ok(!packet.evidenceRefs.includes('other'));
    assert.ok(packet.verifiedFacts.some((fact) => fact.claim === 'same project fact'));
  } finally {
    await rm(fixture.dir, { recursive: true, force: true });
  }
});

test('surfaces contradictory same-subject evidence instead of silently merging it', async () => {
  const fixture = await memoryFixture();
  try {
    const initial = await buildContextPacket({ dir: fixture.dir, project: 'Conflict Fixture' });
    await writeFile(path.join(fixture.memory, 'verification-ledger.jsonl'), [
      JSON.stringify({ id: 'rest', projectId: initial.project.projectId, subject: 'api-style', kind: 'verification', claim: 'REST is canonical', status: 'pass', commit: 'aaa', recordedAt: '2026-01-01T00:00:00.000Z' }),
      JSON.stringify({ id: 'graphql', projectId: initial.project.projectId, subject: 'api-style', kind: 'verification', claim: 'GraphQL is canonical', status: 'pass', commit: 'bbb', recordedAt: '2026-01-02T00:00:00.000Z' }),
    ].join('\n') + '\n');
    const packet = await buildContextPacket({ dir: fixture.dir, project: 'Conflict Fixture' });
    assert.equal(packet.conflicts.length, 1);
    assert.equal(packet.conflicts[0].subject, 'api-style');
    assert.deepEqual(packet.conflicts[0].evidenceRefs.sort(), ['graphql', 'rest']);
  } finally {
    await rm(fixture.dir, { recursive: true, force: true });
  }
});

test('redacts credentials and excludes raw reasoning markers from the context packet', async () => {
  const fixture = await memoryFixture();
  try {
    const initial = await buildContextPacket({ dir: fixture.dir, project: 'Safety Fixture' });
    await writeFile(path.join(fixture.memory, 'research-ledger.jsonl'), [
      JSON.stringify({ id: 'safe', projectId: initial.project.projectId, kind: 'research', claim: 'token=secret-value is never stored', status: 'verified', recordedAt: '2026-01-01T00:00:00.000Z' }),
      JSON.stringify({ id: 'reasoning', projectId: initial.project.projectId, kind: 'research', claim: 'hidden chain-of-thought internal reasoning should not be exported', status: 'verified', recordedAt: '2026-01-01T00:00:00.000Z' }),
    ].join('\n') + '\n');
    const packet = await buildContextPacket({ dir: fixture.dir, project: 'Safety Fixture' });
    const serialized = JSON.stringify(packet);
    assert.match(serialized, /REDACTED_SECRET/);
    assert.doesNotMatch(serialized, /secret-value/);
    assert.doesNotMatch(serialized, /chain-of-thought|internal reasoning/i);
  } finally {
    await rm(fixture.dir, { recursive: true, force: true });
  }
});
