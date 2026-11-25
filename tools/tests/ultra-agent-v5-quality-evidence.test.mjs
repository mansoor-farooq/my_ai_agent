import assert from 'node:assert/strict';
import test from 'node:test';
import { createBenchmarkManifest, validateBenchmarkManifest } from '../ultra-agent-v5/benchmark-manifest.mjs';
import { createAndroidEvidence, summarizeAndroidEvidence } from '../ultra-agent-v5/android-evidence.mjs';

test('benchmark manifest freezes task, repository and verification identity', () => {
  const manifest = createBenchmarkManifest({
    benchmarkId: 'BENCH-001',
    taskId: 'TASK-001',
    agent: 'flutter-mobile-specialist',
    repoCommit: 'a'.repeat(40),
    kitVersion: '1.20.0',
    modelIdentity: 'host-reported:Gemini',
    prompt: 'Fix the overflow',
    checks: ['flutter-analyze'],
    acceptance: ['no-overflow'],
  });
  assert.equal(validateBenchmarkManifest(manifest), true);
  assert.equal(validateBenchmarkManifest({ ...manifest, taskId: 'TASK-002' }), false);
});

test('Android evidence stays not-run without physical or emulator proof', () => {
  const evidence = createAndroidEvidence({ projectRoot: 'D:/Work/app', status: 'not-run', reason: 'device unavailable' });
  assert.equal(evidence.status, 'not-run');
  assert.equal(summarizeAndroidEvidence([evidence]).overallStatus, 'not-run');
  assert.equal(summarizeAndroidEvidence([{ ...evidence, status: 'pass', device: { serial: 'emulator-5554', apiLevel: 35 } }]).overallStatus, 'pass');
});
