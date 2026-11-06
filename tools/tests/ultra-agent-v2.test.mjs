import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const runtime = path.join(root, 'tools', 'ultra-agent-v2');

function run(script, args) {
  return execFileSync(process.execPath, [path.join(runtime, script), ...args], { encoding: 'utf8' });
}

test('preflight produces stable project identity and detects manifests', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v2-preflight-'));
  try {
    await writeFile(path.join(fixture, 'package.json'), '{"name":"fixture"}\n');
    const first = JSON.parse(run('preflight.mjs', ['--dir', fixture, '--project', 'Demo App']));
    const second = JSON.parse(run('preflight.mjs', ['--dir', fixture, '--project', 'Demo App']));
    assert.equal(first.project.projectId, second.project.projectId);
    assert.ok(first.manifests.includes('package.json'));
    assert.deepEqual(first.safety, { credentialsRead: false, projectFilesUploaded: false, hiddenReasoningExported: false });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('preflight and memory share one sanitized project identity', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v2-identity-'));
  try {
    execFileSync('git', ['init'], { cwd: fixture, stdio: 'ignore' });
    execFileSync('git', ['remote', 'add', 'origin', 'https://secret-user:secret-token@example.com/owner/repo.git'], { cwd: fixture, stdio: 'ignore' });
    const preflight = JSON.parse(run('preflight.mjs', ['--dir', fixture, '--project', 'Identity Fixture']));
    JSON.parse(run('memory.mjs', ['init', '--dir', fixture, '--project', 'Identity Fixture']));
    const memory = JSON.parse(run('memory.mjs', ['status', '--dir', fixture, '--project', 'Identity Fixture']));
    assert.equal(preflight.project.projectId, memory.project.projectId);
    assert.equal(preflight.project.projectId.length, 8);
    assert.equal(preflight.project.gitUrl, 'https://example.com/owner/repo.git');
    assert.doesNotMatch(JSON.stringify(memory), /secret-user|secret-token/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('memory initializes a project dossier and redacts secrets on append', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v2-memory-'));
  try {
    JSON.parse(run('memory.mjs', ['init', '--dir', fixture, '--project', 'Memory Fixture']));
    const result = JSON.parse(run('memory.mjs', [
      'append', '--dir', fixture, '--file', 'change-log.md', '--text', 'Verified with apiKey=secret-value and safe output.',
    ]));
    assert.equal(result.redacted, true);
    const content = await readFile(path.join(fixture, '.agents', 'memory', 'change-log.md'), 'utf8');
    assert.match(content, /REDACTED_SECRET/);
    assert.doesNotMatch(content, /secret-value/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('evidence ledger is idempotent and redacts secrets', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v2-evidence-'));
  try {
    const args = [
      'append', '--dir', fixture, '--kind', 'verification', '--id', 'fixed-record',
      '--command', 'npm test', '--result', 'token=secret-value; pass', '--status', 'pass',
    ];
    const first = JSON.parse(run('evidence.mjs', args));
    const second = JSON.parse(run('evidence.mjs', args));
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    const ledger = await readFile(path.join(fixture, '.agents', 'memory', 'verification-ledger.jsonl'), 'utf8');
    assert.equal(ledger.trim().split(/\r?\n/).length, 1);
    assert.match(ledger, /REDACTED_SECRET/);
    assert.doesNotMatch(ledger, /secret-value/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('evidence preserves fail then pass history and stable subjects', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v2-evidence-history-'));
  try {
    const base = ['append', '--dir', fixture, '--project', 'Evidence Fixture', '--kind', 'verification', '--subject', 'unit-tests', '--command', 'npm test'];
    const failed = JSON.parse(run('evidence.mjs', [...base, '--result', 'one failure', '--status', 'fail']));
    const passed = JSON.parse(run('evidence.mjs', [...base, '--result', 'all passed', '--status', 'pass']));
    assert.notEqual(failed.id, passed.id);
    const records = JSON.parse(run('evidence.mjs', ['list', '--dir', fixture, '--project', 'Evidence Fixture', '--kind', 'verification']));
    assert.equal(records.length, 2);
    assert.ok(records.every((record) => record.subject === 'unit-tests'));
    assert.deepEqual(records.map((record) => record.status), ['fail', 'pass']);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('memory compaction writes a bounded conflict-aware snapshot without deleting ledgers', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v2-compact-'));
  try {
    JSON.parse(run('memory.mjs', ['init', '--dir', fixture, '--project', 'Compact Fixture']));
    run('evidence.mjs', ['append', '--dir', fixture, '--project', 'Compact Fixture', '--kind', 'verification', '--subject', 'api-style', '--claim', 'REST is canonical', '--status', 'pass']);
    run('evidence.mjs', ['append', '--dir', fixture, '--project', 'Compact Fixture', '--kind', 'verification', '--subject', 'api-style', '--claim', 'GraphQL is canonical', '--status', 'pass']);
    const compact = JSON.parse(run('memory.mjs', ['compact', '--dir', fixture, '--project', 'Compact Fixture', '--max-facts', '1', '--max-notes', '1']));
    assert.equal(compact.ok, true);
    const snapshot = JSON.parse(await readFile(path.join(fixture, '.agents', 'memory', 'context-snapshot.json'), 'utf8'));
    assert.equal(snapshot.currentFacts.length, 0);
    assert.equal(snapshot.unresolvedConflicts.length, 1);
    assert.equal(snapshot.unresolvedConflicts[0].subject, 'api-style');
    const raw = await readFile(path.join(fixture, '.agents', 'memory', 'verification-ledger.jsonl'), 'utf8');
    assert.equal(raw.trim().split(/\r?\n/).length, 2);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('memory compaction excludes stale and unversioned facts', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'ultra-agent-v2-compact-freshness-'));
  try {
    JSON.parse(run('memory.mjs', ['init', '--dir', fixture, '--project', 'Freshness Fixture']));
    run('evidence.mjs', ['append', '--dir', fixture, '--project', 'Freshness Fixture', '--kind', 'verification', '--subject', 'unversioned', '--claim', 'should not be active', '--status', 'pass']);
    const ledger = path.join(fixture, '.agents', 'memory', 'verification-ledger.jsonl');
    const records = (await readFile(ledger, 'utf8')).trim().split(/\r?\n/).map((line) => JSON.parse(line));
    records.push({ ...records[0], id: 'expired', subject: 'expired', claim: 'expired fact', commit: 'old-commit', validUntil: '2020-01-01T00:00:00.000Z' });
    await writeFile(ledger, records.map((record) => JSON.stringify(record)).join('\n') + '\n');
    JSON.parse(run('memory.mjs', ['compact', '--dir', fixture, '--project', 'Freshness Fixture']));
    const snapshot = JSON.parse(await readFile(path.join(fixture, '.agents', 'memory', 'context-snapshot.json'), 'utf8'));
    assert.equal(snapshot.currentFacts.length, 0);
    assert.ok(snapshot.unresolvedConflicts.some((conflict) => conflict.type === 'unversioned-evidence'));
    assert.ok(snapshot.unresolvedConflicts.some((conflict) => conflict.type === 'stale-evidence'));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
