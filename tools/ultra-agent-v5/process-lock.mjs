#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

function sleepSync(milliseconds) {
  const delay = Math.max(1, Number(milliseconds) || 1);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
}

function ownerIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function lockIsStale(lockPath, staleMs) {
  try {
    const stat = fs.statSync(lockPath);
    const age = Date.now() - stat.mtimeMs;
    if (age > staleMs) return true;
    let owner;
    try { owner = JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch { return age > Math.min(staleMs, 5000); }
    return !ownerIsAlive(Number(owner?.pid));
  } catch (error) {
    return error?.code === 'ENOENT';
  }
}

function acquire(lockPath, { staleMs = 30_000, retryMs = 25, timeoutMs = 5_000 } = {}) {
  const absolute = path.resolve(String(lockPath || ''));
  if (!absolute || absolute === path.parse(absolute).root) fail('process-lock-path-invalid');
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const deadline = Date.now() + Math.max(1, Number(timeoutMs) || 5_000);
  while (true) {
    try {
      const fd = fs.openSync(absolute, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`, 'utf8');
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
      return absolute;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      if (lockIsStale(absolute, Math.max(1, Number(staleMs) || 30_000))) {
        try { fs.unlinkSync(absolute); } catch (unlinkError) { if (unlinkError?.code !== 'ENOENT') { /* another owner still holds it */ } }
        continue;
      }
      if (Date.now() >= deadline) fail('process-lock-timeout');
      sleepSync(retryMs);
    }
  }
}

export function withProcessLockSync(lockPath, fn, options = {}) {
  if (typeof fn !== 'function') fail('process-lock-callback-required');
  const acquired = acquire(lockPath, options);
  try {
    return fn();
  } finally {
    try { fs.unlinkSync(acquired); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  }
}

export { acquire as acquireProcessLockSync };
