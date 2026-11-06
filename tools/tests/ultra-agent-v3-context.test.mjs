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
    assert.ok(!packet.verifiedFacts.some((fact) => fact.claim === 'same project fact'));
    assert.ok(packet.conflicts.some((conflict) => conflict.type === 'unversioned-evidence'));
  } finally {
    await rm(fixture.dir, { recursive: true, force: true });
  }
});

test('surfaces contradictory same-subject evidence instead of silently merging it', async () => {
  const fixture = await memoryFixture();
  try {
    const initial = await buildContextPacket({ dir: fixture.dir, project: 'Conflict Fixture' });
    await writeFile(path.join(fixture.memory, 'verification-ledger.jsonl'), [
      JSON.stringify({ id: 'rest', projectId: initial.project.projectId, subject: 'api-style', kind: 'verification', claim: 'REST is canonical', status: 'pass', recordedAt: '2026-01-01T00:00:00.000Z' }),
      JSON.stringify({ id: 'graphql', projectId: initial.project.projectId, subject: 'api-style', kind: 'verification', claim: 'GraphQL is canonical', status: 'pass', recordedAt: '2026-01-02T00:00:00.000Z' }),
    ].join('\n') + '\n');
    await writeFile(path.join(fixture.memory, 'decisions.md'), [
      `[projectId:${initial.project.projectId}] [subject:api-style] REST is canonical`,
      `[projectId:${initial.project.projectId}] [subject:api-style] GraphQL is canonical`,
    ].join('\n') + '\n');
    const packet = await buildContextPacket({ dir: fixture.dir, project: 'Conflict Fixture' });
    const evidenceConflict = packet.conflicts.find((conflict) => conflict.type === 'contradictory-evidence');
    assert.ok(evidenceConflict);
    assert.equal(evidenceConflict.subject, 'api-style');
    assert.deepEqual(evidenceConflict.evidenceRefs.sort(), ['graphql', 'rest']);
    assert.ok(!packet.verifiedFacts.some((fact) => fact.subject === 'api-style'));
    assert.ok(packet.conflicts.some((conflict) => conflict.type === 'contradictory-decision'));
  } finally {
    await rm(fixture.dir, { recursive: true, force: true });
  }
});

test('surfaces stale evidence and malformed memory instead of silently trusting it', async () => {
  const fixture = await memoryFixture();
  try {
    const initial = await buildContextPacket({ dir: fixture.dir, project: 'Stale Fixture' });
    await writeFile(path.join(fixture.memory, 'verification-ledger.jsonl'), [
      '{malformed',
      JSON.stringify({ id: 'stale', projectId: initial.project.projectId, kind: 'verification', claim: 'old fact', status: 'pass', commit: 'old-commit', recordedAt: '2026-01-01T00:00:00.000Z' }),
    ].join('\n') + '\n');
    const packet = await buildContextPacket({ dir: fixture.dir, project: 'Stale Fixture' });
    assert.ok(packet.conflicts.some((conflict) => conflict.type === 'stale-evidence'));
    assert.ok(packet.conflicts.some((conflict) => conflict.type === 'malformed-memory'));
  } finally {
    await rm(fixture.dir, { recursive: true, force: true });
  }
});

test('does not promote unversioned evidence into verified facts', async () => {
  const fixture = await memoryFixture();
  try {
    const initial = await buildContextPacket({ dir: fixture.dir, project: 'Unversioned Fixture' });
    await writeFile(path.join(fixture.memory, 'verification-ledger.jsonl'), JSON.stringify({
      id: 'unversioned', projectId: initial.project.projectId, kind: 'verification',
      claim: 'unversioned fact', status: 'pass', recordedAt: '2026-01-01T00:00:00.000Z',
    }) + '\n');
    const packet = await buildContextPacket({ dir: fixture.dir, project: 'Unversioned Fixture' });
    assert.ok(!packet.verifiedFacts.some((fact) => fact.id === 'unversioned'));
    assert.ok(packet.conflicts.some((conflict) => conflict.type === 'unversioned-evidence'));
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
