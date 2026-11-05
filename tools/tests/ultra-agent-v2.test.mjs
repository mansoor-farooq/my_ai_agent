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
