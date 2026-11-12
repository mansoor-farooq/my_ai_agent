import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRuleRegistry, evaluateRuleEvidence, resolveRules, validateRuleRegistry } from '../rule-governance.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('registry validation rejects duplicate ids and missing required governance fields', async () => {
  const duplicate = await validateRuleRegistry({ schemaVersion: 1, rules: [
    { id: 'RULE-1', version: 1, priority: 1, scope: ['global'], owner: 'owner', supersedes: null, contentHash: 'sha256:' + 'a'.repeat(64), file: 'rules/a.md' },
    { id: 'RULE-1', version: 1, priority: 1, scope: ['global'], owner: 'owner', supersedes: null, contentHash: 'sha256:' + 'b'.repeat(64), file: 'rules/b.md' },
  ] });
  assert.ok(duplicate.errors.some((error) => /duplicate/i.test(error)));
  const missing = await validateRuleRegistry({ schemaVersion: 1, rules: [{ id: 'RULE-1' }] });
  assert.ok(missing.errors.some((error) => /version|priority|scope|owner/i.test(error)));
});

test('resolver applies security first and project rules before global rules, filtering unrelated rules', () => {
  const registry = createRuleRegistry([
    { id: 'SEC-1', version: 1, priority: 50, scope: ['global'], owner: 'owner', category: 'security', agents: ['*'], tasks: ['*'], file: 'rules/security.md', contentHash: 'sha256:' + 'a'.repeat(64), requiredEvidence: ['policy-check'], verification: [] },
    { id: 'GLB-1', version: 1, priority: 90, scope: ['global'], owner: 'owner', category: 'quality', agents: ['*'], tasks: ['*'], file: 'rules/global.md', contentHash: 'sha256:' + 'b'.repeat(64), requiredEvidence: [], verification: [] },
    { id: 'PRJ-1', version: 1, priority: 1, scope: ['project'], owner: 'owner', category: 'project', projectTypes: ['flutter'], agents: ['flutter-mobile-specialist'], tasks: ['ui'], file: 'rules/flutter.md', contentHash: 'sha256:' + 'c'.repeat(64), requiredEvidence: ['analyze'], verification: ['flutter analyze'] },
    { id: 'PRJ-2', version: 1, priority: 100, scope: ['project'], owner: 'owner', category: 'project', projectTypes: ['dotnet'], agents: ['dotnet-backend-specialist'], tasks: ['api'], file: 'rules/dotnet.md', contentHash: 'sha256:' + 'd'.repeat(64), requiredEvidence: [], verification: [] },
  ]);
  const resolved = resolveRules(registry, { projectType: 'flutter', agent: 'flutter-mobile-specialist', taskType: 'ui' });
  assert.deepEqual(resolved.map((rule) => rule.id), ['SEC-1', 'PRJ-1', 'GLB-1']);
  assert.deepEqual(resolveRules(registry, {}).map((rule) => rule.id), ['SEC-1', 'GLB-1']);
});

test('shipped registry hashes match their Markdown rule contents', async () => {
  const registry = JSON.parse(await readFile(path.join(root, 'shared', 'control-plane', 'rule-registry.json'), 'utf8'));
  const result = await validateRuleRegistry(registry, { root });
  assert.equal(result.valid, true);
  assert.deepEqual(result.hashMismatches, []);
});

test('rule completion is blocked until every required evidence item is present', () => {
  const rule = { id: 'FLUTTER-MOB-001', requiredEvidence: ['analyze', 'layout'] };
  assert.deepEqual(evaluateRuleEvidence([rule], ['analyze']), { compliant: false, missing: [{ ruleId: rule.id, evidence: 'layout' }] });
  assert.deepEqual(evaluateRuleEvidence([rule], ['analyze', 'layout']), { compliant: true, missing: [] });
});
