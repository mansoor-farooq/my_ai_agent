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

async function removeFixture(dir) {
  await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
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
    await removeFixture(fixture.dir);
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
    await removeFixture(fixture.dir);
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
    await removeFixture(fixture.dir);
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
    await removeFixture(fixture.dir);
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
    await removeFixture(fixture.dir);
  }
});

test('reuses the context packet and repository map when project memory is unchanged', async () => {
  const fixture = await memoryFixture();
  try {
    const first = await buildContextPacket({ dir: fixture.dir, project: 'Cache Fixture' });
    const second = await buildContextPacket({ dir: fixture.dir, project: 'Cache Fixture' });
    assert.equal(first.cacheHit, false);
    assert.equal(second.cacheHit, true);
    assert.equal(second.memorySource, 'context-packet-cache');
    assert.equal(second.repositoryMap.schema, 'mansoor.repository-map/v2');
  } finally {
    await removeFixture(fixture.dir);
  }
});

test('refreshes a cached packet when uncommitted source changes and ranks by task query', async () => {
  const fixture = await memoryFixture();
  try {
    await mkdir(path.join(fixture.dir, 'src'), { recursive: true });
    await writeFile(path.join(fixture.dir, 'src', 'auth.ts'), 'export function login() {}\n');
    await writeFile(path.join(fixture.dir, 'src', 'cart.ts'), 'export function addToCart() {}\n');
    await buildContextPacket({ dir: fixture.dir, project: 'Working Tree Fixture' });
    await writeFile(path.join(fixture.dir, 'src', 'auth.ts'), 'export function refreshSession() {}\n');
    const packet = await buildContextPacket({ dir: fixture.dir, project: 'Working Tree Fixture', query: 'session auth', maxSymbols: 1 });
    assert.equal(packet.cacheHit, false);
    assert.equal(packet.repositoryMap.metrics.contentReads, 1);
    assert.equal(packet.repositoryMap.files.length, 1);
    assert.equal(packet.repositoryMap.files[0].path, 'src/auth.ts');
    assert.ok(packet.repositoryMap.files[0].symbols.some((symbol) => symbol.name === 'refreshSession'));
  } finally {
    await removeFixture(fixture.dir);
  }
});

test('project context bootstrap initializes once and preserves manual project-map content', async () => {
  const fixture = await memoryFixture();
  try {
    const mapPath = path.join(fixture.memory, 'project-map.md');
    await writeFile(mapPath, '# Project Map\n\nOwner note: keep this.\n');
    await mkdir(path.join(fixture.dir, 'src'), { recursive: true });
    await writeFile(path.join(fixture.dir, 'src', 'checkout.ts'), 'export function checkout() {}\n');
    const { prepareProjectContext } = await import('../project-context-bootstrap.mjs');
    const query = 'unique-task-prompt-marker-92d7';
    const first = await prepareProjectContext({ dir: fixture.dir, project: 'Bootstrap Fixture', query });
    const second = await prepareProjectContext({ dir: fixture.dir, project: 'Bootstrap Fixture', query });
    const mapText = await (await import('node:fs/promises')).readFile(mapPath, 'utf8');
    const cacheText = await (await import('node:fs/promises')).readFile(path.join(fixture.memory, 'context-packet-cache.json'), 'utf8');
    assert.equal(first.ok, true);
    assert.equal(first.firstRun, true);
    assert.equal(second.firstRun, false);
    assert.equal(second.contextCacheHit, true);
    assert.equal((mapText.match(/mansoor:auto-project-map:start/g) || []).length, 1);
    assert.match(mapText, /Owner note: keep this\./);
    assert.match(mapText, /src\/checkout\.ts/);
    assert.doesNotMatch(cacheText, new RegExp(query));
  } finally {
    await removeFixture(fixture.dir);
  }
});

test('force-map rebuild bypasses the context packet cache', async () => {
  const fixture = await memoryFixture();
  try {
    await mkdir(path.join(fixture.dir, 'src'), { recursive: true });
    await writeFile(path.join(fixture.dir, 'src', 'one.ts'), 'export function one() {}\n');
    await buildContextPacket({ dir: fixture.dir, project: 'Forced Reindex Fixture' });
    const refreshed = await buildContextPacket({ dir: fixture.dir, project: 'Forced Reindex Fixture', forceMap: true });
    assert.equal(refreshed.cacheHit, false);
    assert.equal(refreshed.repositoryMap.cacheHit, false);
    assert.equal(refreshed.repositoryMap.metrics.contentReads, 1);
  } finally {
    await removeFixture(fixture.dir);
  }
});
