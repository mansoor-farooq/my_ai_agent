#!/usr/bin/env node

const MAX_ATTEMPTS = 3;

function list(value) {
  return Array.isArray(value) ? [...new Set(value.map(String).filter(Boolean))] : [];
}

export function repairStage(failure = {}) {
  const attempt = Math.max(1, Number(failure.attempt) || 1);
  const maxAttempts = Math.max(1, Math.min(Number(failure.maxAttempts) || MAX_ATTEMPTS, MAX_ATTEMPTS));
  const stopSignal = Boolean(failure.stopSignal);
  const exhausted = attempt >= maxAttempts;
  const shouldEscalate = stopSignal || exhausted || Boolean(failure.scopeViolation);
  return {
    schema: 'mansoor.core-loop-repair/v1',
    taskId: String(failure.taskId || ''),
    attempt,
    maxAttempts,
    failedChecks: list(failure.failedChecks),
    affectedPaths: list(failure.affectedPaths),
    evidence: list(failure.evidence),
    broadRewriteAllowed: false,
    retry: !shouldEscalate,
    escalated: shouldEscalate,
    reason: stopSignal ? 'stop-signal' : failure.scopeViolation ? 'scope-violation' : exhausted ? 'attempt-limit' : null,
  };
}

