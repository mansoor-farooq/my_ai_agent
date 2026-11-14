import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { withProcessLockSync } from '../ultra-agent-v5/process-lock.mjs';

test('process lock recovers a stale owner and releases after the critical section', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mansoor-lock-'));
  const lockPath = path.join(dir, 'state.lock');
  try {
    fs.writeFileSync(lockPath, JSON.stringify({ pid: 999999, createdAt: '2020-01-01T00:00:00.000Z' }));
    const value = withProcessLockSync(lockPath, () => 'protected', { staleMs: 1, retryMs: 1, timeoutMs: 100 });
    assert.equal(value, 'protected');
    assert.equal(fs.existsSync(lockPath), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('process lock rejects a live owner after the bounded timeout', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mansoor-lock-live-'));
  const lockPath = path.join(dir, 'state.lock');
  try {
    fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    assert.throws(
      () => withProcessLockSync(lockPath, () => 'should-not-run', { staleMs: 60_000, retryMs: 1, timeoutMs: 10 }),
      /process-lock-timeout/
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
