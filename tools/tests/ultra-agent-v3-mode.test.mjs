import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanEnvelope } from '../ultra-agent-v3/plan.mjs';
import { selectMode } from '../ultra-agent-v3/mode.mjs';

test('routine reversible work selects fast mode with one specialist and targeted verification', () => {
  const result = selectMode({
    request: 'Fix the button label on the settings page',
    project: 'portal',
    risk: 'low',
    changedPaths: ['src/settings/button.tsx'],
    specialists: ['mansoor-ui-specialist', 'qa-release-specialist'],
    availableTools: ['preflight', 'verification'],
  });
  assert.equal(result.mode, 'fast');
  assert.deepEqual(result.requiredChecks, ['targeted-verification']);
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.executionProfile, { thinking: 'low', maxSpecialists: 1, parallelism: 1, budgetClass: 'economy' });
  assert.equal(result.escalationPolicy.maxRecoveryAttempts, 2);
  assert.deepEqual(result.budgets, {
    maxContextFiles: 12,
    maxSkillBodies: 6,
    maxToolCalls: 12,
    maxWebQueries: 0,
    maxVerificationCommands: 1,
    maxRecoveryAttempts: 1,
    maxUnresolvedImageCalls: 1,
    maxIdlePolls: 0,
  });

  const plan = createPlanEnvelope({
    request: 'Fix the button label on the settings page',
    project: 'portal',
    risk: 'low',
    specialists: ['mansoor-ui-specialist', 'qa-release-specialist'],
    availableTools: ['preflight', 'verification'],
  });
  assert.equal(plan.mode, 'fast');
  assert.deepEqual(plan.specialists, ['mansoor-ui-specialist']);
  assert.ok(plan.phases.includes('VERIFY'));
  assert.ok(plan.acceptanceEvidence.includes('targeted-verification'));
});

test('uncertain or previously failed work escalates to premium without switching providers', () => {
  const result = selectMode({
    request: 'Fix the intermittent checkout issue',
    risk: 'low',
    uncertainScope: true,
    previousFailureCount: 1,
    costPreference: 'balanced',
  });
  assert.equal(result.mode, 'premium');
  assert.ok(result.reasons.some((reason) => /uncertain|previous verification failure/i.test(reason)));
  assert.equal(result.executionProfile.thinking, 'medium');
  assert.equal(result.executionProfile.parallelism, 3);
  assert.equal(result.escalationPolicy.providerSwitch, false);
  assert.equal(result.escalationPolicy.accountRotation, false);
});

test('architecture and explicit research work selects premium mode with research and verification gates', () => {
  const result = selectMode({
    request: 'Design a secure multi-tenant architecture and compare current official patterns',
    project: 'platform',
    risk: 'high',
    explicitResearch: true,
    specialists: ['saas-architect', 'application-security-reviewer', 'research-docs-specialist'],
    availableTools: ['preflight', 'research', 'verification', 'independent-check'],
  });
  assert.equal(result.mode, 'premium');
  assert.ok(result.reasons.some((reason) => /risk|research|architecture/i.test(reason)));
  assert.deepEqual(result.requiredChecks, ['research-ledger', 'targeted-verification', 'independent-check']);
  assert.deepEqual(result.blockers, []);
});

test('premium work reports missing tools instead of silently downgrading to fast', () => {
  const result = selectMode({
    request: 'Prepare a production release security review',
    project: 'release',
    risk: 'critical',
    requiredTools: ['research', 'verification', 'independent-check'],
    availableTools: ['verification'],
  });
  assert.equal(result.mode, 'premium');
  assert.deepEqual(result.blockers, ['research', 'independent-check']);

  const plan = createPlanEnvelope({
    request: 'Prepare a production release security review',
    project: 'release',
    risk: 'critical',
    requiredTools: ['research', 'verification', 'independent-check'],
    availableTools: ['verification'],
  });
  assert.equal(plan.mode, 'premium');
  assert.deepEqual(plan.blockers, ['research', 'independent-check']);
});

test('explicit independent sub-agent work stays Fast and exposes a three-worker wave', () => {
  const request = 'Use parallel sub-agents on independent chunks to fix the mobile banner';
  const plan = createPlanEnvelope({
    request,
    specialists: ['research-docs-specialist', 'flutter-mobile-specialist', 'mansoor-ui-specialist', 'qa-release-specialist'],
    workItems: [
      { id: 'source-audit', role: 'research-docs-specialist', readOnly: true, ownedPaths: ['assets/reference/**'] },
      { id: 'layout-audit', role: 'flutter-mobile-specialist', readOnly: true, ownedPaths: ['lib/widgets/**'] },
      { id: 'acceptance-audit', role: 'mansoor-ui-specialist', readOnly: true, ownedPaths: ['test-cases/ui/**'] },
    ],
  });
  assert.equal(plan.mode, 'fast');
  assert.deepEqual(plan.specialists, ['research-docs-specialist', 'flutter-mobile-specialist', 'mansoor-ui-specialist']);
  assert.deepEqual(plan.parallelWaves.map((wave) => wave.workItemIds), [['acceptance-audit', 'layout-audit', 'source-audit']]);
  assert.deepEqual(plan.parallelPlan, { requested: true, status: 'parallel', maxConcurrent: 3, workItemCount: 3, reason: null });
  assert.ok(plan.phases.includes('DELEGATE'));
});

test('parallel request falls back to one specialist when no independent work is planned', () => {
  const plan = createPlanEnvelope({
    request: 'Run parallel sub-agents to resize this one icon',
    specialists: ['mansoor-ui-specialist', 'flutter-mobile-specialist'],
    workItems: [],
  });
  assert.deepEqual(plan.specialists, ['mansoor-ui-specialist']);
  assert.deepEqual(plan.parallelPlan, { requested: true, status: 'single-owner', maxConcurrent: 1, workItemCount: 0, reason: 'no-independent-work-items' });
  assert.ok(!plan.phases.includes('DELEGATE'));
});

test('multiple independent planned work items enable parallel capacity without prompt keywords', () => {
  const plan = createPlanEnvelope({
    request: 'Update the banner and its app integration',
    specialists: ['asset-owner', 'app-integrator'],
    workItems: [
      { id: 'asset', ownedPaths: ['assets/banner.png'] },
      { id: 'app', ownedPaths: ['lib/widgets/banner.dart'] },
    ],
  });
  assert.equal(plan.mode, 'fast');
  assert.equal(plan.parallelPlan.status, 'parallel');
  assert.equal(plan.parallelPlan.maxConcurrent, 2);
  assert.equal(plan.parallelPlan.workItemCount, 2);
});

test('parallel Fast work raises only the bounded worker/tool budget and keeps Low thinking', () => {
  const result = selectMode({
    request: 'Use parallel sub-agents for independent banner and widget chunks',
    parallelize: true,
  });
  assert.equal(result.mode, 'fast');
  assert.equal(result.executionProfile.thinking, 'low');
  assert.equal(result.executionProfile.maxSpecialists, 3);
  assert.equal(result.budgets.maxToolCalls, 18);
  assert.equal(result.budgets.maxSkillBodies, 6);
  assert.equal(result.budgets.maxWebQueries, 0);
  assert.equal(result.budgets.maxIdlePolls, 0);
});

test('premium work keeps research budget and never inherits the Fast no-research cap', () => {
  const result = selectMode({
    request: 'Research a secure production architecture from official docs',
    explicitResearch: true,
    risk: 'high',
  });
  assert.equal(result.mode, 'premium');
  assert.equal(result.budgets.maxWebQueries, 4);
  assert.equal(result.budgets.maxRecoveryAttempts, 2);
  assert.equal(result.budgets.maxIdlePolls, 1);
});
