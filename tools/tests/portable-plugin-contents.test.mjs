import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  inspectPortableSource,
  readAgentSkillReferences,
} from '../portable-components.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('portable source contains the complete owned skill and rule library', async () => {
  const inventory = await inspectPortableSource(root);

  assert.equal(inventory.skills.length, 171);
  assert.equal(inventory.rules.length, 4);
  assert.deepEqual(inventory.invalidSkills, []);
  assert.deepEqual(inventory.invalidRules, []);
  assert.deepEqual(inventory.nestedSkillFiles, []);
  assert.deepEqual(inventory.unsafePaths, []);
  assert.deepEqual(inventory.brokenLocalReferences, []);
  assert.deepEqual(inventory.provenanceGaps, []);
});

test('portable source includes every unique Antigravity global skill', async () => {
  const inventory = await inspectPortableSource(root);
  const requiredGlobalSkills = [
    'bigquery-observability',
    'bigquery-optimization',
    'bigquery-troubleshooting',
    'cloud-databases-onboarding',
    'create-plan',
    'gcp-spark-observability',
    'gh-address-comments',
    'gh-fix-ci',
    'mansoor-ui-specialist',
    'memory',
    'omniroute-gateway',
    'stop-slop',
  ];

  assert.deepEqual(requiredGlobalSkills.filter((name) => !inventory.skills.includes(name)), []);
});

test('imported mobile skills carry redistribution provenance', async () => {
  const inventory = await inspectPortableSource(root);
  const imported = new Set([
    'android-design',
    'flutter-ui-ux',
    'flutter-ui-ux-engineer',
    'mobile-ui-ux-designer',
  ]);

  assert.deepEqual(inventory.skillsWithoutProvenance.filter((name) => imported.has(name)), []);
});

test('every shipped agent skill reference resolves to a bundled skill body', async () => {
  const inventory = await inspectPortableSource(root);
  const references = await readAgentSkillReferences(root);
  const missing = [...new Set(references.filter((name) => !inventory.skills.includes(name)))].sort();

  assert.deepEqual(missing, []);
  assert.ok(references.length >= 200, `expected at least 200 skill references, found ${references.length}`);
});

test('portable bundle retains important non-Antigravity skill support files', async () => {
  const expectedFiles = [
    'skills/impeccable/agents/impeccable_asset_producer.toml',
    'skills/impeccable/agents/impeccable_documenter.toml',
    'skills/impeccable/agents/impeccable_finish_reviewer.toml',
    'skills/impeccable/agents/impeccable_manual_edit_applier.toml',
    'skills/impeccable/agents/openai.yaml',
    'skills/frontend-design/LICENSE',
    'skills/frontend-design/assets/vanilla-starter/index.html',
    'skills/frontend-design/assets/vanilla-starter/script.js',
    'skills/frontend-design/assets/vanilla-starter/style.css',
    'skills/frontend-design/references/aesthetic-playbook.md',
    'skills/frontend-design/references/implementation-patterns.md',
    'skills/project-context-orchestrator/agents/openai.yaml',
  ];

  for (const relative of expectedFiles) {
    await assert.doesNotReject(access(path.join(root, relative)), relative);
  }
});
