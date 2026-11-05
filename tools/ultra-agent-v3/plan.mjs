import crypto from 'node:crypto';
import { selectMode } from './mode.mjs';

function createPlanEnvelope(input = {}) {
  const selection = selectMode(input);
  const specialists = [...new Set((Array.isArray(input.specialists) ? input.specialists : []).map(String).filter(Boolean))];
  const selectedSpecialists = selection.mode === 'fast' ? specialists.slice(0, 1) : specialists.slice(0, 5);
  const phases = selection.mode === 'premium'
    ? ['PREFLIGHT', 'CONTEXT', 'MODE', 'PLAN', 'DELEGATE', 'BUILD', 'VERIFY', 'EVALUATE']
    : ['PREFLIGHT', 'CONTEXT', 'MODE', 'BUILD', 'VERIFY', 'EVALUATE'];
  const material = JSON.stringify({
    project: input.project || 'project',
    request: input.request || '',
    mode: selection.mode,
    changedPaths: input.changedPaths || [],
  });
  const planId = crypto.createHash('sha256').update(material).digest('hex').slice(0, 12);
  return {
    planId,
    mode: selection.mode,
    reasons: selection.reasons,
    blockers: selection.blockers,
    phases,
    specialists: selectedSpecialists,
    acceptanceEvidence: selection.requiredChecks,
  };
}

export { createPlanEnvelope };
