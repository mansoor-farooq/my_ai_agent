import crypto from 'node:crypto';
import path from 'node:path';
import { selectMode } from './mode.mjs';
import { scheduleDelegation } from './delegation.mjs';

function createPlanEnvelope(input = {}) {
  const selection = selectMode(input);
  const specialists = [...new Set((Array.isArray(input.specialists) ? input.specialists : []).map(String).filter(Boolean))];
  const maxParallel = input.parallelize === false ? 1 : selection.executionProfile?.parallelism || 1;
  const delegation = scheduleDelegation({
    workItems: Array.isArray(input.workItems) ? input.workItems : [],
    maxParallel: Math.min(maxParallel, input.maxParallel || 3),
  });
  const maxConcurrent = delegation.blockers.length
    ? 1
    : Math.max(1, ...delegation.waves.map((wave) => wave.workItemIds.length));
  const workItemCount = Array.isArray(input.workItems) ? input.workItems.length : 0;
  const isParallel = maxConcurrent > 1 && delegation.blockers.length === 0;
  const parallelPlan = {
    requested: selection.parallelRequested,
    status: delegation.blockers.length ? 'blocked' : isParallel ? 'parallel' : workItemCount > 1 ? 'serialized' : 'single-owner',
    maxConcurrent,
    workItemCount,
    reason: delegation.blockers.length
      ? 'delegation-blocked'
      : isParallel
        ? null
        : workItemCount > 1
          ? 'dependencies-or-path-overlap'
          : workItemCount === 1 ? 'one-work-item' : 'no-independent-work-items',
  };
  const specialistLimit = selection.mode === 'fast'
    ? isParallel ? Math.min(selection.executionProfile.maxSpecialists, maxConcurrent) : 1
    : selection.executionProfile.maxSpecialists;
  const selectedSpecialists = specialists.slice(0, specialistLimit);
  const executionProfile = {
    ...selection.executionProfile,
    maxSpecialists: selectedSpecialists.length || Math.min(selection.executionProfile.maxSpecialists, 1),
    parallelism: isParallel ? maxConcurrent : 1,
  };
  const phases = selection.mode === 'premium'
    ? ['PREFLIGHT', 'CONTEXT', 'MODE', 'PLAN', 'DELEGATE', 'BUILD', 'VERIFY', 'EVALUATE']
    : isParallel
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
    executionProfile,
    budgets: selection.budgets,
    blockers: selection.blockers,
    parallelPlan,
    phases,
    specialists: selectedSpecialists,
    parallelWaves: delegation.waves,
    delegationBlockers: delegation.blockers,
    acceptanceEvidence: selection.requiredChecks,
  };
}

export { createPlanEnvelope };

if (process.argv[1] && path.basename(process.argv[1]) === 'plan.mjs') {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input-json');
  const rawInput = inputIndex >= 0 ? args[inputIndex + 1] : null;
  if (!rawInput) throw new Error('Usage: node plan.mjs --input-json <JSON object>');
  let input;
  try { input = JSON.parse(rawInput); } catch { throw new Error('--input-json must be a JSON object'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('--input-json must be a JSON object');
  console.log(JSON.stringify(createPlanEnvelope(input), null, 2));
}
