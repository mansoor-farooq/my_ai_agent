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
import { validateRuleRegistry } from '../rule-governance.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('portable source contains the complete owned skill and rule library', async () => {
  const inventory = await inspectPortableSource(root);

  assert.equal(inventory.skills.length, 179);
  assert.equal(inventory.rules.length, 4);
  assert.deepEqual(inventory.invalidSkills, []);
  assert.deepEqual(inventory.invalidRules, []);
  assert.deepEqual(inventory.nestedSkillFiles, []);
  assert.deepEqual(inventory.unsafePaths, []);
  assert.deepEqual(inventory.brokenLocalReferences, []);
  assert.deepEqual(inventory.provenanceGaps, []);
});

test('governed rule registry is valid and matches bundled rule hashes', async () => {
  const registry = JSON.parse(await readFile(path.join(root, 'shared', 'control-plane', 'rule-registry.json'), 'utf8'));
  const result = await validateRuleRegistry(registry, { root });
  assert.equal(result.valid, true, JSON.stringify(result));
  assert.equal(registry.rules.length, 4);
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

test('portable source includes the official Vercel UI skill pack', async () => {
  const inventory = await inspectPortableSource(root);
  for (const name of [
    'web-design-guidelines',
    'vercel-react-best-practices',
    'vercel-composition-patterns',
    'vercel-react-view-transitions',
    'writing-guidelines'
  ]) assert.ok(inventory.skills.includes(name), name);
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

test('Flutter specialist carries production layout QA and ERP research capability', async () => {
  const inventory = await inspectPortableSource(root);
  assert.ok(inventory.skills.includes('flutter-production-layout-qa'));
  const profile = await readFile(path.join(root, 'agents', 'Antigravity', 'custom-agents', 'flutter-mobile-specialist', 'agent.md'), 'utf8');
  for (const name of [
    'flutter-production-layout-qa',
    'premium-crm-template',
    'enterprise-erp-reverse-engineering',
    'ui-ux-pro-max',
    'design-reference-research',
    'workflow-operator-console-ui',
    'webapp-testing',
  ]) assert.match(profile, new RegExp(`skills/${name}`));
});

test('skill provenance ledger covers every bundled skill without inventing public licences', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'SKILL-PROVENANCE.json'), 'utf8'));
  const inventory = await inspectPortableSource(root);
  assert.equal(manifest.policy.packageDistribution, 'private-only');
  assert.equal(manifest.policy.neverInventLicenseOrProvenance, true);
  assert.equal(manifest.skills.length, inventory.skills.length);
  assert.deepEqual(manifest.skills.map((entry) => entry.name).sort(), inventory.skills);
  assert.ok(manifest.skills.every((entry) => Array.isArray(entry.sourceRoots) && entry.sourceRoots.length));
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
      `$ProgressPreference = 'SilentlyContinue'; Expand-Archive -LiteralPath ${quotePowerShell(archive)} -DestinationPath ${quotePowerShell(output)} -Force`,
    ], { stdio: 'pipe' });

    for (const relative of requiredPortableSupportFiles) {
      await assert.doesNotReject(access(path.join(output, relative)), relative);
    }
    await assert.doesNotReject(access(path.join(output, 'tools', 'ultra-agent-v2', 'rag.mjs')), 'project-scoped PostgreSQL RAG runtime');
    for (const relative of [
      'tools/ultra-agent-v2/preflight.mjs',
      'tools/ultra-agent-v2/memory.mjs',
      'tools/ultra-agent-v2/evidence.mjs',
      'tools/ultra-agent-v2/project-identity.mjs',
      'tools/sync-knowledge-bank.mjs',
      'tools/validate-capability-manifest.mjs',
      'shared/knowledge/PROJECT_MEMORY_SCHEMA.md',
      'shared/control-plane/agent-capability-manifest.json',
      'shared/ULTRA_AGENT_V2_PROTOCOL.md',
      'tools/ultra-agent-v3/state.mjs',
      'tools/ultra-agent-v3/mode.mjs',
      'tools/ultra-agent-v3/plan.mjs',
      'tools/ultra-agent-v3/context.mjs',
      'tools/ultra-agent-v3/evaluate.mjs',
      'tools/ultra-agent-v3/trace.mjs',
      'tools/ultra-agent-v3/delegation.mjs',
      'tools/ultra-agent-v3/policy.mjs',
      'tools/rule-governance.mjs',
      'shared/control-plane/rule-registry.json',
      'tools/rule-governance.mjs',
      'shared/control-plane/rule-registry.json',
      'tools/ultra-agent-v3/activity.mjs',
      'tools/ultra-agent-v4/benchmark.mjs',
      'tools/ultra-agent-v4/recovery.mjs',
      'tools/ultra-agent-v4/effects.mjs',
      'tools/ultra-agent-v4/approvals.mjs',
      'tools/ultra-agent-v4/core-loop.mjs',
      'tools/ultra-agent-v4/stages/context.mjs',
      'tools/ultra-agent-v4/stages/plan.mjs',
      'tools/ultra-agent-v4/stages/reference.mjs',
      'tools/ultra-agent-v4/stages/act.mjs',
      'tools/ultra-agent-v4/stages/verify.mjs',
      'tools/ultra-agent-v4/stages/repair.mjs',
      'tools/ultra-agent-v4/stages/answer.mjs',
      'tools/ultra-agent-v4/stages/remember.mjs',
      'tools/ultra-agent-v2/memory-provenance.mjs',
      'tools/repository-map.mjs',
      'tools/benchmark-corpus.mjs',
      'tools/mobile-ui-flow-gate.mjs',
      'tools/ultra-agent-v4/managed-runtime.mjs',
      'tools/run-agent-security-fixtures.mjs',
      'tools/security-agent-fixtures.json',
      'tools/antigravity-runtime-preflight.mjs',
      'tools/antigravity-pretool-guard.mjs',
      'tools/antigravity-pretool-guard.ps1',
      'tools/sync-global-rules.ps1',
      'tools/benchmark-schema.json',
      'benchmarks/README.md',
    ]) {
      await assert.doesNotReject(access(path.join(output, relative)), relative);
    }
    await assert.doesNotReject(access(path.join(output, 'SKILL-PROVENANCE.json')), 'SKILL-PROVENANCE.json');
    const plugin = JSON.parse(await readFile(path.join(output, 'plugin.json'), 'utf8'));
    assert.equal(plugin.version, '1.11.0');
    const hooks = JSON.parse(await readFile(path.join(output, 'hooks.json'), 'utf8'));
    assert.ok(hooks['mansoor-native-write-guard'].PreToolUse.some((entry) => entry.matcher === '*' && entry.hooks.some((handler) => handler.command.includes('antigravity-pretool-guard.ps1'))));
    await assert.doesNotReject(access(path.join(output, 'tools', 'antigravity-pretool-guard.ps1')));
    const installer = await readFile(path.join(output, 'Install-Mansoor-Agent-Team.ps1'), 'utf8');
    const ruleSync = await readFile(path.join(output, 'tools', 'sync-global-rules.ps1'), 'utf8');
    assert.match(installer, /nodejs\.org\/dist\/index\.json/);
    assert.match(installer, /SHASUMS256\.txt/);
    assert.match(installer, /antigravity\.google\/cli\/install\.ps1/);
    assert.match(installer, /antigravity-plugins-official/);
    assert.match(installer, /"plugin", "list", "--json"/);
    assert.match(installer, /Already installed; leaving the active package untouched/);
    assert.match(installer, /Start-Process/);
    assert.match(installer, /Start-Transcript/);
    assert.match(installer, /INSTALLER ERROR:/);
    assert.match(installer, /mansoor-agent-hub-stage-/);
    assert.match(installer, /Copy-Item -LiteralPath \$sourceItem/);
    assert.match(installer, /@\(.*'tools'.*'shared'.*\)/s);
    assert.match(installer, /\[MF\]\s+MANSOOR FAROOQ/);
    assert.match(installer, /ULTRA AGENT v4/);
    assert.match(installer, /VALIDATED\s+\/\s+15 agents, 179 skills, 4 rules, 1 hook/);
    assert.match(installer, /Invoke-AgyCaptured -CommandArguments @\("plugin", "validate"/);
    assert.ok(installer.indexOf('function Invoke-AgyCaptured') < installer.indexOf('$validationResult = Invoke-AgyCaptured'));
    assert.ok(installer.indexOf('function Invoke-AgyCaptured') < installer.indexOf('$inventoryResult = Invoke-AgyCaptured'));
    assert.match(installer, /PACKAGE INTEGRITY/);
    assert.match(installer, /OPTIONAL EXTENSIONS/);
    assert.match(installer, /INSTALLATION COMPLETE/);
    assert.match(installer, /"plugin", "install", \$installStage/);
    assert.match(installer, /MANSOOR_AGENT_ROOT/);
    assert.match(installer, /installed plugin config/);
    assert.match(installer, /Agent profile verification failed/);
    assert.match(installer, /sync-global-rules\.ps1/);
    assert.match(installer, /UPDATE PLAN/);
    assert.match(installer, /Get-TreeDrift/);
    assert.match(installer, /ACTIVE PACKAGE/);
    assert.match(installer, /UPDATED  \/ version/);
    assert.match(ruleSync, /RULE PRESERVED/);
    assert.match(ruleSync, /RULE UPDATED/);
    assert.match(ruleSync, /\.mansoor-rule-state\.json/);
    const launcher = await readFile(path.join(output, 'Install-Mansoor-Agent-Team.cmd'), 'utf8');
    assert.match(launcher, /Install-Mansoor-Agent-Team\.log/);
    assert.match(launcher, /pause/);
    assert.doesNotMatch(installer, /gh auth login|github\.com\/login/);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('build output keeps compact routers and full skill instructions separately', async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'mansoor-agent-hub-router-'));
  try {
    await copyPortableComponents(root, output, /(?:AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_-]{32,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]{30,})/);
    const router = await readFile(path.join(output, 'skills', 'software-architect', 'SKILL.md'), 'utf8');
    const full = await readFile(path.join(output, 'skill-library', 'software-architect', 'SKILL.md'), 'utf8');
    assert.match(router, /Read full instructions at \.\.\/skill-library\/software-architect\/SKILL\.md/);
    assert.match(router, /skill-library\/software-architect\/SKILL\.md/);
    assert.ok(router.length < 900, `router unexpectedly large: ${router.length}`);
    assert.ok(full.length > router.length * 10, 'full instructions were not preserved separately');
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
