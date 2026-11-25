#!/usr/bin/env node

export const READINESS_SCHEMA = 'mansoor.v5-production-readiness/v1';
export const READINESS_THRESHOLD = 0.99;
export const READINESS_WEIGHTS = Object.freeze({
  policyApproval: 0.20,
  isolation: 0.20,
  durableRecovery: 0.15,
  engineeringSuccess: 0.15,
  ragMemory: 0.10,
  observability: 0.10,
  mobileRelease: 0.10,
});

export const HARD_GATES = Object.freeze([
  'unauthorizedTier3',
  'secretExposure',
  'untraceableSideEffects',
  'lostApprovalState',
  'failedRollbackDrills',
  'unexplainedAuditGaps',
  'mandatoryReleaseTests',
]);

function metricValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : null;
}

function hardGatePassed(name, value) {
  if (name === 'mandatoryReleaseTests') return value === true || value === 'pass' || value === 'passed';
  return Number(value) === 0;
}

export function evaluateProductionReadiness({ metrics = {}, hardGates = {}, threshold = READINESS_THRESHOLD } = {}) {
  const normalizedThreshold = Math.max(0, Math.min(1, Number(threshold) || READINESS_THRESHOLD));
  const metricReport = {};
  const unverified = [];
  let score = 0;
  for (const [name, weight] of Object.entries(READINESS_WEIGHTS)) {
    const value = metricValue(metrics[name]);
    metricReport[name] = { value, weight, contribution: value === null ? 0 : value * weight };
    if (value === null) unverified.push(name);
    else score += value * weight;
  }
  const hardFailures = HARD_GATES.filter((name) => !hardGatePassed(name, hardGates[name]));
  const blockers = hardFailures.map((name) => `hard-gate:${name}`);
  let status = 'ready';
  if (hardFailures.length) status = 'blocked';
  else if (unverified.length) status = 'unverified';
  else if (score < normalizedThreshold) status = 'not-ready';
  return {
    schema: READINESS_SCHEMA,
    threshold: normalizedThreshold,
    score: Number(score.toFixed(6)),
    status,
    metricReport,
    hardGates: Object.fromEntries(HARD_GATES.map((name) => [name, { observed: hardGates[name] ?? null, passed: hardGatePassed(name, hardGates[name]) }])),
    hardFailures,
    unverified,
    blockers,
  };
}

