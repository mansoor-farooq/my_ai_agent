import test from 'node:test';
import assert from 'node:assert/strict';
import { rankOpenSourceCandidates } from '../open-source-first-gate.mjs';

const good = {
  name: 'maintained-commerce-core',
  url: 'https://github.com/example/maintained-commerce-core',
  license: 'MIT',
  stars: 1200,
  forks: 180,
  lastActivity: '2026-10-01T00:00:00.000Z',
  defaultBranch: 'main',
  capabilities: ['commerce', 'orders', 'inventory'],
  sourceRefs: ['src/orders', 'src/inventory', 'tests/orders'],
  reverseEngineeringMap: { modules: ['orders'], dataModels: ['Order'], workflows: ['checkout'], apis: ['POST /orders'], tests: ['orders'], integrationBoundaries: ['repository-adapter'] },
};

test('selects a compatible maintained repository for reuse', () => {
  const result = rankOpenSourceCandidates({ request: 'build commerce orders and inventory', candidates: [good] });
  assert.equal(result.schema, 'mansoor.open-source-gate/v1');
  assert.equal(result.decision, 'reuse');
  assert.equal(result.selected.name, good.name);
  assert.deepEqual(result.reverseEngineeringMap.modules, ['orders']);
});

test('does not let stars override an incompatible license', () => {
  const result = rankOpenSourceCandidates({ request: 'build commerce orders', candidates: [{ ...good, name: 'popular-gpl', license: 'AGPL-3.0', stars: 500000 }] });
  assert.equal(result.decision, 'inspire');
  assert.equal(result.selected.licenseState, 'review-required');
  assert.ok(result.gaps.includes('license-review-required'));
});

test('falls back to custom when bounded discovery has no candidates', () => {
  const result = rankOpenSourceCandidates({ request: 'build a novel module', candidates: [] });
  assert.equal(result.decision, 'custom');
  assert.ok(result.gaps.includes('no-open-source-candidates-found'));
});

test('honors explicit scratch-first owner intent', () => {
  const result = rankOpenSourceCandidates({ request: 'build commerce', candidates: [good], scratchFirst: true });
  assert.equal(result.decision, 'custom');
  assert.equal(result.selected, null);
  assert.ok(result.gaps.includes('owner-requested-scratch-first'));
});

test('marks strong compatible sources needing adaptation as adapt', () => {
  const result = rankOpenSourceCandidates({ request: 'build commerce orders', candidates: [{ ...good, adaptationRequired: true }] });
  assert.equal(result.decision, 'adapt');
});
