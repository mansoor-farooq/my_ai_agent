import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPlanEnvelope } from '../ultra-agent-v3/plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const runtime = path.join(root, 'tools', 'ultra-agent-v3', 'delegation.mjs');

function schedule(workItems, maxParallel = 3) {
  const result = spawnSync(process.execPath, [runtime, '--work-items', JSON.stringify(workItems), '--max-parallel', String(maxParallel)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test('disjoint writers and read-only workers share bounded parallel waves', () => {
  const result = schedule([
    { id: 'ui', role: 'ui', ownedPaths: ['src/ui/**'], readOnly: false },
    { id: 'api', role: 'api', ownedPaths: ['src/api/**'], readOnly: false },
    { id: 'research', role: 'research', ownedPaths: ['src/**'], readOnly: true },
    { id: 'docs', role: 'docs', ownedPaths: ['docs/**'], readOnly: false },
  ], 3);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.waves[0].parallel, true);
  assert.deepEqual(result.waves[0].workItemIds, ['api', 'docs', 'research']);
  assert.deepEqual(result.waves[1].workItemIds, ['ui']);
  assert.ok(result.waves.every((wave) => wave.workItemIds.length <= 3));
});

test('overlapping or unknown write ownership is serialized', () => {
  const result = schedule([
    { id: 'first', role: 'builder', ownedPaths: ['src/app.ts'], readOnly: false },
    { id: 'second', role: 'builder', ownedPaths: ['src/app.ts'], readOnly: false },
    { id: 'unknown', role: 'builder', ownedPaths: [], readOnly: false },
  ]);
  assert.deepEqual(result.waves.map((wave) => wave.workItemIds), [['first'], ['second'], ['unknown']]);
});

test('missing and cyclic dependencies block delegation', () => {
  const missing = schedule([{ id: 'review', role: 'reviewer', readOnly: true, dependsOn: ['builder'] }]);
  assert.ok(missing.blockers.some((blocker) => blocker.code === 'missing-dependency'));
  const cyclic = schedule([
    { id: 'a', role: 'builder', dependsOn: ['b'], ownedPaths: ['a'] },
    { id: 'b', role: 'builder', dependsOn: ['a'], ownedPaths: ['b'] },
  ]);
  assert.ok(cyclic.blockers.some((blocker) => blocker.code === 'dependency-cycle'));
});

test('plan envelope adds parallel waves while retaining specialist compatibility', () => {
  const plan = createPlanEnvelope({
    request: 'Build UI and API in independent paths',
    risk: 'high',
    specialists: ['ui', 'api', 'qa'],
    workItems: [
      { id: 'ui', role: 'ui', ownedPaths: ['src/ui/**'] },
      { id: 'api', role: 'api', ownedPaths: ['src/api/**'] },
      { id: 'qa', role: 'qa', readOnly: true, dependsOn: ['ui', 'api'] },
    ],
  });
  assert.deepEqual(plan.specialists, ['ui', 'api', 'qa']);
  assert.deepEqual(plan.parallelWaves.map((wave) => wave.workItemIds), [['api', 'ui'], ['qa']]);
  assert.deepEqual(plan.delegationBlockers, []);
});
