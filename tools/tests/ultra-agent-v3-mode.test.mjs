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
