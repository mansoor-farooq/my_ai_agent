import crypto from 'node:crypto';
import path from 'node:path';
import { selectMode } from './mode.mjs';
import { scheduleDelegation } from './delegation.mjs';
import { routePremiumRequest } from '../premium-agent-router.mjs';
import { buildThreeLanePlan } from './three-lane.mjs';
import { concurrencyPolicy, resolveParallelCapacity } from './concurrency.mjs';

function createPlanEnvelope(input = {}) {
  const routingPlan = input.autoRoute === true
    ? routePremiumRequest({ request: input.request, files: input.files, changedPaths: input.changedPaths, risk: input.risk, autonomy: input.autonomy || input.autonomyProfile, maxParallel: input.maxParallel })
    : null;
  const plannedWorkItems = Array.isArray(input.workItems) ? input.workItems : routingPlan?.suggestedWorkItems || [];
  const selection = selectMode({ ...input, workItems: plannedWorkItems });
  const specialists = [...new Set((Array.isArray(input.specialists) && input.specialists.length ? input.specialists : routingPlan?.recommendedSpecialists || []).map(String).filter(Boolean))];
  const maxParallel = resolveParallelCapacity({
    requested: input.parallelize === false ? 1 : input.maxParallel || selection.executionProfile?.parallelism,
    autonomy: input.autonomy || input.autonomyProfile,
    parallelRequested: input.parallelize !== false && selection.parallelRequested,
  });
  const delegation = scheduleDelegation({
    workItems: plannedWorkItems,
    maxParallel,
  });
  const maxConcurrent = delegation.blockers.length
    ? 1
    : Math.max(1, ...delegation.waves.map((wave) => wave.workItemIds.length));
  const workItemCount = plannedWorkItems.length;
  const isParallel = maxConcurrent > 1 && delegation.blockers.length === 0;
  const convergenceRequired = Boolean(input.requireConvergence) || workItemCount > 1 || selection.mode === 'premium';
  const threeLaneEnabled = input.threeLane !== false && (input.threeLane === true
    || (selection.mode === 'premium' && (workItemCount > 1 || specialists.length > 1 || input.autoRoute === true)));
  const executionTopology = buildThreeLanePlan({
    enabled: threeLaneEnabled,
    request: input.request,
    specialists,
    workItems: plannedWorkItems,
    routingPlan,
    changedPaths: input.changedPaths,
    risk: input.risk,
  });
  const hasWriter = plannedWorkItems.some((item) => !item?.readOnly);
  const isolationRequested = Boolean(input.isolate) || Boolean(input.testingBranch);
  const requestText = String(input.request || '');
  const explicitlyReversible = input.reversible === true || /\b(reversible|small|quick|minor|one[- ]file|typo|localized)\b/i.test(requestText);
  const isolationRecommended = isolationRequested || (hasWriter && (isParallel || (selection.mode === 'premium' && !explicitlyReversible)));
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
  const convergencePlan = {
    required: convergenceRequired,
    joinPolicy: convergenceRequired ? 'all-required-branches' : 'single-owner',
    verifier: convergenceRequired ? 'independent-read-only-verifier' : null,
    synthesisOwner: 'Mansoor AI Team Manager',
    maxTargetedRepairs: convergenceRequired ? 2 : 0,
    requiredEvidence: convergenceRequired
      ? ['worker-result-contract', 'merged-wave-results', 'independent-verification', 'scope-and-gap-report']
      : ['targeted-verification'],
  };
  const isolationPlan = {
    requested: isolationRequested,
    recommended: isolationRecommended,
    mode: isolationRecommended ? 'managed-task-worktree' : 'current-checkout-fast-path',
    reason: isolationRequested
      ? 'owner-requested-isolation'
      : isolationRecommended
        ? isParallel ? 'parallel-writers-or-shared-review' : 'premium-risk-boundary'
        : explicitlyReversible ? 'reversible-fast-path' : 'small-reversible-task',
    reversible: explicitlyReversible,
    testingBranch: input.testingBranch ? String(input.testingBranch) : null,
    promotion: isolationRecommended ? 'exact-reviewed-patch-to-primary-staged-for-owner-review' : 'direct-scoped-change',
  };
  const capabilityProfile = {
    mode: selection.mode,
    pack: selection.mode === 'premium' ? 'premium-autonomous-engineering' : 'fast-targeted-execution',
    adaptiveRouting: true,
    maxParallelWorkers: maxParallel,
    concurrency: concurrencyPolicy({ autonomy: input.autonomy || input.autonomyProfile, capacity: maxParallel }),
    selectiveIsolation: isolationPlan.mode,
    convergence: convergencePlan.required ? 'required-with-independent-verifier' : 'single-owner-verification',
    recovery: selection.mode === 'premium' ? 'two-targeted-attempts' : 'one-targeted-attempt',
    executionTopology: executionTopology.mode,
    sharedContextHandoff: executionTopology.duplicateReadPolicy,
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
    executionTopology: executionTopology.mode,
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
    convergencePlan,
    executionTopology,
    isolationPlan,
    capabilityProfile,
    routingPlan,
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
