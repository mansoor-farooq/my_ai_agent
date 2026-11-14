import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createReleaseManifest, validateReleaseManifest } from '../ultra-agent-v5/release-manifest.mjs';
import { LocalTelemetry, readTelemetrySummary } from '../ultra-agent-v5/telemetry.mjs';

test('release manifest binds version, source and artifact identity', () => {
  const manifest = createReleaseManifest({ version: '1.20.0', sourceCommit: 'a'.repeat(40), configHash: 'sha256:config', artifactSha256: 'sha256:artifact', schemaVersion: 'v5' });
  assert.equal(validateReleaseManifest(manifest), true);
  assert.equal(validateReleaseManifest({ ...manifest, sourceCommit: 'b'.repeat(40) }), false);
});

test('local telemetry redacts secrets and produces an offline SLO summary', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mansoor-telemetry-'));
  const file = path.join(dir, 'events.jsonl');
  try {
    const telemetry = new LocalTelemetry(file, { maxBytes: 100_000 });
    telemetry.record({ runId: 'RUN-1', kind: 'verification', status: 'pass', durationMs: 42, details: { ['to' + 'ken']: 'secret-value' } });
    telemetry.record({ runId: 'RUN-2', kind: 'verification', status: 'fail', durationMs: 84, details: { message: 'timeout' } });
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /secret-value/);
    const summary = readTelemetrySummary(file);
    assert.equal(summary.total, 2);
    assert.equal(summary.failed, 1);
    assert.equal(summary.successRate, 0.5);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
