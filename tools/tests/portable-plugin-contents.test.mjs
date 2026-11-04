import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  inspectPortableSource,
  readAgentSkillReferences,
} from '../portable-components.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('portable source contains the complete owned skill and rule library', async () => {
  const inventory = await inspectPortableSource(root);

  assert.equal(inventory.skills.length, 159);
  assert.equal(inventory.rules.length, 4);
  assert.deepEqual(inventory.invalidSkills, []);
  assert.deepEqual(inventory.invalidRules, []);
  assert.deepEqual(inventory.nestedSkillFiles, []);
  assert.deepEqual(inventory.unsafePaths, []);
  assert.deepEqual(inventory.brokenLocalReferences, []);
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
