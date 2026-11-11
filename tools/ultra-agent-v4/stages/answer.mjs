#!/usr/bin/env node

function list(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function answerStage(state = {}) {
  const verification = state.verification || {};
  let status = String(state.status || '').toLowerCase();
  if (!status) status = verification.allPassed === true ? 'complete' : 'unverified';
  if (state.scopeViolation) status = 'blocked';
  if (state.escalated) status = 'escalated';
  if (status === 'complete' && verification.allPassed !== true) status = 'unverified';
  return {
    schema: 'mansoor.core-loop-answer/v1',
    status,
    facts: list(state.facts),
    assumptions: list(state.assumptions),
    changes: list(state.changes ?? state.changedPaths),
    evidence: list(state.evidence),
    verification,
    blockers: list(state.blockers),
    nextAction: state.nextAction == null ? null : String(state.nextAction),
  };
}

