import crypto from 'node:crypto';
import path from 'node:path';

const premiumWords = /\b(architecture|security|release|production|payment|migration|ml|machine learning|pytorch|model training|authentication|authorization|database|compliance|research|reverse engineer)\b/i;

function toolsSet(value) {
  if (Array.isArray(value)) return new Set(value.map((item) => String(item)));
  if (value && typeof value === 'object') return new Set(Object.entries(value).filter(([, available]) => available).map(([name]) => name));
  return null;
}

function selectMode(input = {}) {
  const request = String(input.request || '');
  const risk = String(input.risk || 'low').toLowerCase();
  const explicitResearch = Boolean(input.explicitResearch) || /\b(deep research|research|inspiration|compare sources|official docs)\b/i.test(request);
  const riskSignal = ['high', 'critical'].includes(risk);
  const domainSignal = premiumWords.test(request);
  const previousFailureCount = Math.max(0, Number(input.previousFailureCount) || 0);
  const uncertainScope = Boolean(input.uncertainScope);
  const premium = riskSignal || explicitResearch || domainSignal || uncertainScope || previousFailureCount > 0;
  const mode = premium ? 'premium' : 'fast';
  const reasons = [];
  if (riskSignal) reasons.push(`risk=${risk}`);
  if (explicitResearch) reasons.push('research requested or implied');
  if (domainSignal) reasons.push('architecture/security/production-sensitive domain');
  if (uncertainScope) reasons.push('uncertain scope requires deeper discovery');
  if (previousFailureCount > 0) reasons.push('previous verification failure requires escalation');
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
    ? { thinking: 'low', maxSpecialists: 1, parallelism: 1, budgetClass: 'economy' }
    : {
      thinking: riskSignal ? 'high' : 'medium',
      maxSpecialists: 5,
      parallelism: 3,
      budgetClass: costPreference === 'economy' ? 'balanced' : 'premium',
    };
  const escalationPolicy = {
    maxRecoveryAttempts: 2,
    escalateOn: ['uncertain-scope', 'verification-failure', 'risk-boundary'],
    providerSwitch: false,
    accountRotation: false,
  };
  return { mode, reasons, requiredChecks, blockers, executionProfile, escalationPolicy };
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
    availableTools: available.length ? available : undefined,
    requiredTools: required.length ? required : undefined,
  };
  console.log(JSON.stringify(selectMode(input), null, 2));
}

export { selectMode };
