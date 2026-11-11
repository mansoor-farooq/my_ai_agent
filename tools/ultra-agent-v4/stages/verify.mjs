#!/usr/bin/env node
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

function hash(value) {
  return `sha256:${crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')}`;
}

function safeList(value) {
  return Array.isArray(value) ? value.map(String) : [];
}

export function verifyStage(input = {}) {
  const registry = Array.isArray(input.registry) ? input.registry : [];
  return {
    schema: 'mansoor.core-loop-verification-plan/v1',
    taskId: String(input.taskId || ''),
    checks: registry.map((check) => ({
      id: String(check?.id || ''),
      required: check?.required !== false,
      tool: String(check?.tool || ''),
      args: safeList(check?.args),
      cwd: check?.cwd ? String(check.cwd) : null,
      timeoutMs: Math.max(1, Number(check?.timeoutMs) || 120000),
      parser: String(check?.parser || 'exit-code'),
    })),
    changedPaths: safeList(input.changedPaths),
    acceptance: safeList(input.acceptance),
  };
}

function runOne(check = {}) {
  return new Promise((resolve) => {
    const id = String(check.id || '');
    if (!id || !check.tool || !Array.isArray(check.args) || (check.parser && check.parser !== 'exit-code')) {
      resolve({ id, status: 'unverified', exit_code: null, stdout_hash: null, stderr_hash: null, reason: 'malformed-check' });
      return;
    }
    const stdout = [];
    const stderr = [];
    let settled = false;
    let timer;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({
        id,
        ...result,
        stdout_hash: hash(stdout.join('')),
        stderr_hash: hash(stderr.join('')),
      });
    };
    let child;
    try {
      child = spawn(check.tool, check.args, {
        cwd: check.cwd || process.cwd(),
        shell: false,
        windowsHide: true,
        env: check.env ? { ...process.env, ...check.env } : process.env,
      });
    } catch (error) {
      finish({ status: 'unverified', exit_code: null, reason: error.code === 'ENOENT' ? 'tool-missing' : 'spawn-failed' });
      return;
    }
    child.stdout?.on('data', (chunk) => stdout.push(chunk.toString()));
    child.stderr?.on('data', (chunk) => stderr.push(chunk.toString()));
    child.once('error', (error) => finish({ status: error.code === 'ENOENT' ? 'unverified' : 'fail', exit_code: null, reason: error.code === 'ENOENT' ? 'tool-missing' : 'spawn-failed' }));
    child.once('close', (code, signal) => finish({ status: code === 0 ? 'pass' : 'fail', exit_code: code, signal: signal || null }));
    timer = setTimeout(() => {
      try { child.kill(); } catch { /* process may already be closed */ }
      finish({ status: 'fail', exit_code: null, reason: 'timeout' });
    }, Math.max(1, Number(check.timeoutMs) || 120000));
  });
}

export async function runChecks(registry = [], changes = {}, options = {}) {
  const checks = Array.isArray(registry) ? registry : [];
  const results = [];
  for (const raw of checks) {
    const check = { ...raw, cwd: raw?.cwd || options.cwd };
    results.push(await runOne(check));
  }
  const required = checks.filter((check) => check?.required !== false);
  const allPassed = required.length > 0 && required.every((check) => {
    const result = results.find((entry) => entry.id === String(check?.id || ''));
    return result?.status === 'pass';
  });
  return {
    schema: 'mansoor.core-loop-verification/v1',
    allPassed,
    checks: results,
    changedPaths: Array.isArray(changes?.changedPaths) ? changes.changedPaths.map(String) : [],
    failedChecks: results.filter((result) => result.status === 'fail').map((result) => result.id),
    unverifiedChecks: results.filter((result) => result.status === 'unverified').map((result) => result.id),
  };
}

