import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  classifyHostFailure,
  computeRetryPlan,
  readDaemonHealth,
  selectRuntimeAdapter,
  withBoundedRetry,
} from '../ultra-agent-v5/host-resilience.mjs';
import { connectRuntimeClient } from '../ultra-agent-v4/daemon/daemon.mjs';

test('retry plan is bounded and deterministic', () => {
  assert.deepEqual(computeRetryPlan({ attempt: 1, maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 500, jitterMs: 0 }), { attempt: 1, maxAttempts: 3, delayMs: 100, canRetry: true });
  assert.deepEqual(computeRetryPlan({ attempt: 3, maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 500, jitterMs: 0 }), { attempt: 3, maxAttempts: 3, delayMs: 400, canRetry: false });
});

test('host failure classifier retries only transient runtime failures', () => {
  assert.equal(classifyHostFailure(Object.assign(new Error('refused'), { code: 'ECONNREFUSED' })).kind, 'recoverable-host');
  assert.equal(classifyHostFailure(new Error('WSL relay: execvpe(/bin/bash) failed')).kind, 'recoverable-host');
  assert.equal(classifyHostFailure(Object.assign(new Error('permission denied'), { code: 'EACCES' })).kind, 'non-retryable');
  assert.equal(classifyHostFailure(new Error('secret rejected')).kind, 'non-retryable');
});

test('bounded retry recovers transient host failure without changing policy', async () => {
  let calls = 0;
  const waits = [];
  const result = await withBoundedRetry(async () => {
    calls += 1;
    if (calls < 3) throw Object.assign(new Error('socket closed'), { code: 'ECONNRESET' });
    return 'ready';
  }, { maxAttempts: 3, baseDelayMs: 1, sleep: async (ms) => waits.push(ms) });
  assert.equal(result, 'ready');
  assert.equal(calls, 3);
  assert.deepEqual(waits, [1, 2]);
});

test('runtime adapter prefers WSL and falls back to Windows without permission override', () => {
  assert.deepEqual(selectRuntimeAdapter({ platform: 'win32', wslAvailable: true, windowsAvailable: true }), { name: 'wsl', fallback: 'windows', permissionAuthority: 'antigravity-selected' });
  assert.deepEqual(selectRuntimeAdapter({ platform: 'win32', wslAvailable: false, windowsAvailable: true }), { name: 'windows', fallback: null, permissionAuthority: 'antigravity-selected' });
  assert.deepEqual(selectRuntimeAdapter({ platform: 'linux', wslAvailable: false, windowsAvailable: false }), { name: 'linux', fallback: null, permissionAuthority: 'antigravity-selected' });
});

test('daemon health distinguishes live, stale and unavailable lock state', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mansoor-health-'));
  const lockFile = path.join(root, 'daemon.lock.json');
  const now = Date.parse('2026-11-24T12:00:00.000Z');
  fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, heartbeatAt: '2026-11-24T11:59:59.000Z' }));
  assert.equal(readDaemonHealth({ paths: { lockFile }, now: () => now, staleMs: 15_000 }).status, 'ready');
  fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, heartbeatAt: '2026-11-24T11:59:00.000Z' }));
  const stale = readDaemonHealth({ paths: { lockFile }, now: () => now, staleMs: 15_000 });
  assert.equal(stale.status, 'stale');
  assert.equal(stale.recoverable, true);
  fs.rmSync(lockFile);
  assert.deepEqual(readDaemonHealth({ paths: { lockFile }, now: () => now }), { status: 'unavailable', recoverable: true, heartbeatAgeMs: null, pid: null });
  fs.rmSync(root, { recursive: true, force: true });
});

test('runtime client uses bounded retry for unavailable daemon and preserves failure classification', async () => {
  const waits = [];
  await assert.rejects(() => connectRuntimeClient({ paths: { socketName: path.join(os.tmpdir(), `missing-agent-${Date.now()}.sock`) }, timeoutMs: 25, maxAttempts: 2, baseDelayMs: 1, sleep: async (ms) => waits.push(ms) }), (error) => {
    assert.equal(error.resilience.kind, 'recoverable-host');
    assert.equal(error.resilience.canRetry, false);
    return true;
  });
  assert.deepEqual(waits, [1]);
});
