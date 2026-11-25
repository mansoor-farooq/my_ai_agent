#!/usr/bin/env node
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

function hash(value) {
  return `sha256:${crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')}`;
}

function safeList(value) {
  return Array.isArray(value) ? value.map(String) : [];
}

const SAFE_ENV_KEYS = Object.freeze([
  'PATH', 'Path', 'PATHEXT', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'ComSpec', 'SYSTEMROOT',
  'SystemDrive', 'PROGRAMFILES', 'ProgramFiles', 'ProgramFiles(x86)',
]);
const SECRET_ENV_PATTERN = /(TOKEN|KEY|PASSWORD|PASSWD|SECRET|PRIVATE|CREDENTIAL|AUTH|COOKIE|CERT|SIGNING)/i;

function normalizedEnvKey(key) {
  return String(key || '').trim();
}

function buildVerificationEnvironment(check = {}, options = {}) {
  const source = check.env && typeof check.env === 'object' && !Array.isArray(check.env) ? check.env : {};
  const allowlist = new Set([
    ...SAFE_ENV_KEYS,
    ...safeList(options.envAllowlist),
    ...safeList(check.envAllowlist),
  ].map(normalizedEnvKey).filter(Boolean));
  const result = {};
  for (const key of allowlist) {
    const value = process.env[key];
    if (value !== undefined) result[key] = String(value);
  }
  const denied = [];
  for (const [rawKey, rawValue] of Object.entries(source)) {
    const key = normalizedEnvKey(rawKey);
    if (!key || SECRET_ENV_PATTERN.test(key) || !allowlist.has(key)) {
      denied.push(key || rawKey);
      continue;
    }
    result[key] = String(rawValue);
  }
  return { env: result, denied };
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
      envAllowlist: safeList(check?.envAllowlist),
    })),
    changedPaths: safeList(input.changedPaths),
    acceptance: safeList(input.acceptance),
  };
}

function runOne(check = {}, options = {}) {
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
    const environment = buildVerificationEnvironment(check, options);
    if (environment.denied.length) {
      resolve({ id, status: 'unverified', exit_code: null, stdout_hash: hash(''), stderr_hash: hash(''), reason: 'env-not-allowlisted', deniedEnvKeys: environment.denied });
      return;
    }
    let child;
    try {
      child = spawn(check.tool, check.args, {
        cwd: check.cwd || process.cwd(),
        shell: false,
        windowsHide: true,
        env: environment.env,
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
    results.push(await runOne(check, options));
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

