import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContextEnvelope, resolveDefaultPolicies, validateAuthInvariant, validateScopeContract } from '../ultra-agent-v4/context-bundle.mjs';

test('default policies select inventory and session invariants without forcing JWT universally', () => {
  const policies = resolveDefaultPolicies({ projectType: 'commerce', detectedAuth: 'jwt', domain: 'inventory-management' });
  assert.ok(policies.some((policy) => policy.id === 'INV-CONTRACT-001'));
  assert.ok(policies.some((policy) => policy.id === 'AUTH-SESSION-001'));
  const apiKeyProject = resolveDefaultPolicies({ projectType: 'service', detectedAuth: 'api-key', domain: 'inventory-management' });
  assert.ok(!apiKeyProject.some((policy) => policy.id === 'AUTH-SESSION-001'));
});

test('context envelope auto-loads project identity, memory and scope without a file declaration', async () => {
  const envelope = await buildContextEnvelope({
    projectDir: process.cwd(),
    task: { projectId: 'PRJ-001', taskId: 'TASK-001', objective: 'Improve inventory management', scope: ['src/**'], acceptance: ['inventory remains inventory'] },
    projectContext: { verifiedFacts: [{ claim: 'Inventory is the canonical domain', sourceRefs: ['README.md#L1'] }], conflicts: [] },
  });
  assert.equal(envelope.projectId, 'PRJ-001');
  assert.equal(envelope.taskId, 'TASK-001');
  assert.ok(Array.isArray(envelope.verifiedFacts));
  assert.deepEqual(envelope.scope, ['src/**']);
});

test('scope contract blocks inventory domain drift and unrequested features', () => {
  const envelope = { domain: 'inventory-management', nonGoals: ['store marketplace'], scope: ['src/**'] };
  const result = validateScopeContract({ task: { objective: 'Improve inventory management', scope: ['src/**'], acceptance: ['stock movement works'] }, envelope, proposedChanges: { objective: 'Convert this to a store-based marketplace', affectedPaths: ['src/catalog/store.dart'], extraFeatures: ['seller storefront'] } });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /domain drift|extra feature/i);
});

test('scope contract blocks changed paths outside the approved scope', () => {
  const result = validateScopeContract({ task: { objective: 'Fix inventory', scope: ['src/**'], acceptance: ['tests pass'] }, envelope: { scope: ['src/**'] }, proposedChanges: { affectedPaths: ['database/migration.sql'] } });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /outside.*scope/i);
});

test('auth invariant blocks expired or mismatched sessions before protected API work', () => {
  const expired = validateAuthInvariant({ request: { userId: 'u-1', tenantId: 't-1' }, session: { authenticated: true, subject: 'u-1', tenantId: 't-1', expiresAt: '2020-01-01T00:00:00Z' }, policy: { auth: 'jwt', now: '2026-11-14T00:00:00Z' } });
  assert.equal(expired.allowed, false);
  assert.match(expired.reason, /expired/i);
  const mismatch = validateAuthInvariant({ request: { userId: 'u-2', tenantId: 't-1' }, session: { authenticated: true, subject: 'u-1', tenantId: 't-1', expiresAt: '2027-01-01T00:00:00Z' }, policy: { auth: 'jwt', now: '2026-11-14T00:00:00Z' } });
  assert.equal(mismatch.allowed, false);
  assert.match(mismatch.reason, /subject|user/i);
});

test('auth invariant allows a valid session and reports other mechanisms as not applicable', () => {
  const valid = validateAuthInvariant({ request: { userId: 'u-1', tenantId: 't-1' }, session: { authenticated: true, subject: 'u-1', tenantId: 't-1', expiresAt: '2027-01-01T00:00:00Z' }, policy: { auth: 'jwt', now: '2026-11-14T00:00:00Z' } });
  assert.equal(valid.allowed, true);
  const apiKey = validateAuthInvariant({ request: { userId: 'u-1' }, session: null, policy: { auth: 'api-key' } });
  assert.deepEqual(apiKey, { allowed: true, status: 'not-applicable' });
});
