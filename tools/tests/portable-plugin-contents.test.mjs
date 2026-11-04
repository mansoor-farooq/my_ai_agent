import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  copyPortableComponents,
  inspectPortableSource,
  requiredPortableSupportFiles,
  readAgentSkillReferences,
} from '../portable-components.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('portable source contains the complete owned skill and rule library', async () => {
  const inventory = await inspectPortableSource(root);

  assert.equal(inventory.skills.length, 172);
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

test('premium CRM capability is present and staffed to the right specialists', async () => {
  const inventory = await inspectPortableSource(root);
  assert.ok(inventory.skills.includes('premium-crm-template'));
  for (const agent of ['production-orchestrator', 'mansoor-ui-specialist', 'saas-architect', 'enterprise-schema-architect', 'workflow-automation-specialist']) {
    const profile = await readFile(path.join(root, 'agents', 'Antigravity', 'custom-agents', agent, 'agent.md'), 'utf8');
    assert.match(profile, /skills\/premium-crm-template/);
  }
});

test('portable bundle retains important non-Antigravity skill support files', async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'mansoor-agent-hub-support-'));
  try {
    await copyPortableComponents(root, output, /(?:AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_-]{32,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]{30,})/);
    for (const relative of requiredPortableSupportFiles) {
      await assert.doesNotReject(access(path.join(output, relative)), relative);
    }
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('built ZIP retains the support files after archive creation', async () => {
  const archive = path.join(root, 'dist', 'mansoor-agent-hub.zip');
  await assert.doesNotReject(access(archive), 'build the ZIP before running archive assertions');
  const output = await mkdtemp(path.join(os.tmpdir(), 'mansoor-agent-hub-archive-'));
  try {
    const quotePowerShell = (value) => `'${value.replaceAll("'", "''")}'`;
    execFileSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath ${quotePowerShell(archive)} -DestinationPath ${quotePowerShell(output)} -Force`,
    ], { stdio: 'pipe' });

    for (const relative of requiredPortableSupportFiles) {
      await assert.doesNotReject(access(path.join(output, relative)), relative);
    }
    const plugin = JSON.parse(await readFile(path.join(output, 'plugin.json'), 'utf8'));
    assert.equal(plugin.version, '1.3.2');
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
