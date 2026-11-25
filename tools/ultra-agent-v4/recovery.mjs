#!/usr/bin/env node
import crypto from 'node:crypto';
import path from 'node:path';

const nonRetryable = new Set(['destructive-action', 'permission-denied', 'quota-exhausted', 'security-policy', 'authorization-failed']);

function createRecoveryPlan(input = {}) {
  const failureCode = String(input.failureCode || 'unknown-failure').toLowerCase();
  const attempt = Math.max(1, Number(input.attempt) || 1);
  const maxAttempts = Math.max(1, Math.min(Number(input.maxAttempts) || 2, 3));
  const failureSignature = String(input.failureSignature || crypto.createHash('sha256').update(`${failureCode}|${(input.failedChecks || []).join(',')}|${(input.affectedPaths || []).join(',')}`).digest('hex').slice(0, 16));
  let stopReason = null;
  if (nonRetryable.has(failureCode)) stopReason = failureCode;
  else if (input.previousSignature && input.previousSignature === failureSignature) stopReason = 'repeated-failure-signature';
  else if (attempt >= maxAttempts) stopReason = 'recovery-attempt-limit';
  const retry = !stopReason && ['verification-failed', 'test-failed', 'transient-tool-failure'].includes(failureCode);
  if (!retry && !stopReason) stopReason = 'unclassified-failure';
  return {
    retry,
    resumeFrom: retry ? 'VERIFY' : null,
    checks: [...new Set((input.failedChecks || []).map(String).filter(Boolean))],
    affectedPaths: [...new Set((input.affectedPaths || []).map(String).filter(Boolean))],
    failureSignature,
    attempt,
    maxAttempts,
    stopReason,
    broadRewriteAllowed: false,
    automaticRollback: false,
  };
}

export async function runConvergence({ checks, repair = async () => ({}), maxAttempts = 2 } = {}) {
  if (typeof checks !== 'function') throw new Error('checks function is required');
  const bound = Math.max(1, Math.min(Number(maxAttempts) || 2, 3));
  const repairs = [];
  const nonRetryableCodes = new Set(['destructive-action', 'permission-denied', 'quota-exhausted', 'security-policy', 'authorization-failed']);
  let last = null;
  for (let attempt = 1; attempt <= bound; attempt += 1) {
    last = await checks({ attempt });
    if (last?.ok === true) return { ok: true, attempts: attempt, repairs, last, stopReason: null };
    const failureCode = String(last?.failureCode || 'verification-failed').toLowerCase();
    if (nonRetryableCodes.has(failureCode)) return { ok: false, attempts: attempt, repairs, last, stopReason: failureCode };
    if (attempt >= bound) return { ok: false, attempts: attempt, repairs, last, stopReason: 'attempt-limit' };
    repairs.push(await repair({ attempt, failureCode, failedChecks: last?.failedChecks || [], affectedPaths: last?.affectedPaths || [] }));
  }
  return { ok: false, attempts: bound, repairs, last, stopReason: 'attempt-limit' };
}

export { createRecoveryPlan };

if (process.argv[1] && path.basename(process.argv[1]) === 'recovery.mjs') {
  const args = process.argv.slice(2);
  const getArg = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
  if ((args[0] || 'plan') !== 'plan') throw new Error('Usage: recovery.mjs plan [options]');
  const output = createRecoveryPlan({
    failureCode: getArg('--failure-code'),
    failureSignature: getArg('--signature'),
    previousSignature: getArg('--previous-signature'),
    attempt: getArg('--attempt', '1'),
    maxAttempts: getArg('--max-attempts', '2'),
    failedChecks: getArg('--failed-checks').split(',').map((value) => value.trim()).filter(Boolean),
    affectedPaths: getArg('--affected-paths').split(',').map((value) => value.trim()).filter(Boolean),
  });
  console.log(JSON.stringify(output, null, 2));
}
