import crypto from 'node:crypto';
import path from 'node:path';

const premiumWords = /\b(architecture|security|release|production|payment|migration|ml|machine learning|pytorch|model training|authentication|authorization|database|compliance|research|reverse engineer)\b/i;

function toolsSet(value) {
  if (Array.isArray(value)) return new Set(value.map((item) => String(item)));
  if (value && typeof value === 'object') return new Set(Object.entries(value).filter(([, available]) => available).map(([name]) => name));
  return null;
}

function executionBudgets(mode, parallelRequested) {
  if (mode === 'fast') {
    return {
      maxContextFiles: 12,
      maxSkillBodies: 6,
      maxToolCalls: parallelRequested ? 18 : 12,
      maxWebQueries: 0,
      maxVerificationCommands: 1,
      maxRecoveryAttempts: 1,
      maxUnresolvedImageCalls: 1,
      maxIdlePolls: 0,
    };
  }
  return {
    maxContextFiles: 32,
    maxSkillBodies: 12,
    maxToolCalls: 30,
    maxWebQueries: 4,
    maxVerificationCommands: 4,
    maxRecoveryAttempts: 2,
    maxUnresolvedImageCalls: 1,
    maxIdlePolls: 1,
  };
}

function latencyProfile(mode, riskSignal) {
  const requestedEffort = mode === 'fast' ? 'low' : (riskSignal ? 'high' : 'medium');
  return {
    requestedModel: 'Gemini 3.8 Flash',
    requestedEffort,
    contextStrategy: mode === 'fast' ? 'relevant-only' : 'bounded-deep',
    skillStrategy: mode === 'fast' ? 'on-demand' : 'targeted-deep',
    // These args are usable with `agy`; the desktop selector remains host-owned.
    cliArgs: ['--model', 'Gemini 3.8 Flash', '--effort', requestedEffort],
  };
}

function selectMode(input = {}) {
  const request = String(input.request || '');
  const risk = String(input.risk || 'low').toLowerCase();
  const explicitResearch = Boolean(input.explicitResearch) || /\b(deep research|research|inspiration|compare sources|official docs)\b/i.test(request);
  const riskSignal = ['high', 'critical'].includes(risk);
  const domainSignal = premiumWords.test(request);
  const previousFailureCount = Math.max(0, Number(input.previousFailureCount) || 0);
  const uncertainScope = Boolean(input.uncertainScope);
  const readyWorkItems = Array.isArray(input.workItems)
    ? input.workItems.filter((item) => !Array.isArray(item?.dependsOn) || item.dependsOn.length === 0).length
    : 0;
  const parallelRequested = input.parallelize === true || (input.parallelize !== false && (
    /\bparallel(?:ize|ism)?\b|\bsub[-\s]?agents?\b|\bindependent (?:chunks|workstreams)\b|\bfan[- ]?out\b|\bdifferent chunks\b/i.test(request)
    || readyWorkItems > 1
  ));
  const premium = riskSignal || explicitResearch || domainSignal || uncertainScope || previousFailureCount > 0;
  const mode = premium ? 'premium' : 'fast';
  const reasons = [];
  if (riskSignal) reasons.push(`risk=${risk}`);
  if (explicitResearch) reasons.push('research requested or implied');
  if (domainSignal) reasons.push('architecture/security/production-sensitive domain');
  if (uncertainScope) reasons.push('uncertain scope requires deeper discovery');
  if (previousFailureCount > 0) reasons.push('previous verification failure requires escalation');
  if (parallelRequested) reasons.push('independent parallel work requested');
  if (!reasons.length) reasons.push('routine and reversible request');
  const requiredChecks = premium
    ? ['research-ledger', 'targeted-verification', ...(riskSignal ? ['independent-check'] : [])]
    : ['targeted-verification'];
  const available = toolsSet(input.availableTools);
  const requiredTools = Array.isArray(input.requiredTools) && input.requiredTools.length
    ? input.requiredTools.map(String)
    : premium ? ['research', 'verification', ...(riskSignal ? ['independent-check'] : [])] : [];
  const blockers = available ? requiredTools.filter((tool) => !available.has(tool)) : [];
  const costPreference = String(input.costPreference || 'balanced').toLowerCase();
  const executionProfile = mode === 'fast'
    ? parallelRequested
      ? { thinking: 'low', maxSpecialists: 3, parallelism: 3, budgetClass: 'economy' }
      : { thinking: 'low', maxSpecialists: 1, parallelism: 1, budgetClass: 'economy' }
    : {
      thinking: riskSignal ? 'high' : 'medium',
      maxSpecialists: 5,
      parallelism: input.parallelize === false ? 1 : 3,
      budgetClass: costPreference === 'economy' ? 'balanced' : 'premium',
    };
  const budgets = executionBudgets(mode, parallelRequested);
  const escalationPolicy = {
    maxRecoveryAttempts: 2,
    escalateOn: ['uncertain-scope', 'verification-failure', 'risk-boundary'],
    providerSwitch: false,
    accountRotation: false,
  };
  return {
    mode,
    reasons,
    requiredChecks,
    blockers,
    parallelRequested,
    executionProfile,
    budgets,
    escalationPolicy,
    latencyProfile: latencyProfile(mode, riskSignal),
  };
}

function cliArg(args, name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'mode.mjs') {
  const args = process.argv.slice(2);
  const available = cliArg(args, '--available-tools', '').split(',').map((value) => value.trim()).filter(Boolean);
  const required = cliArg(args, '--required-tools', '').split(',').map((value) => value.trim()).filter(Boolean);
  const input = {
    request: cliArg(args, '--request'),
    risk: cliArg(args, '--risk', 'low'),
    explicitResearch: args.includes('--explicit-research'),
    parallelize: args.includes('--no-parallelize') ? false : args.includes('--parallelize') ? true : undefined,
    availableTools: available.length ? available : undefined,
    requiredTools: required.length ? required : undefined,
  };
  const workItemsJson = cliArg(args, '--work-items', '');
  if (workItemsJson) {
    input.workItems = JSON.parse(workItemsJson);
    if (!Array.isArray(input.workItems)) throw new Error('--work-items must be a JSON array');
  }
  console.log(JSON.stringify(selectMode(input), null, 2));
}

export { selectMode };
