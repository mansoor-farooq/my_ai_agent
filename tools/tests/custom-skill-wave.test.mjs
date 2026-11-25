import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { CUSTOM_SKILL_IDS, customSkillsForAgent, customSkillWave } from '../custom-skill-wave.mjs';
import { CODEX_CUSTOM_SKILL_IDS, syncCustomSkills } from '../install-codex-custom-skills.mjs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('declares the complete locally-authored custom skill family', async () => {
  assert.equal(CUSTOM_SKILL_IDS.length, 34);
  for (const id of CUSTOM_SKILL_IDS) {
    const body = await fs.readFile(path.join(root, 'skills', id, 'SKILL.md'), 'utf8');
    assert.match(body, /^---\r?\nname: /);
    assert.match(body, /^description: Use when /m);
    assert.match(body, /Stop condition/i);
  }
});

test('gives every shipped specialist a bounded custom bundle', async () => {
  for (const [agentId, bundle] of Object.entries(customSkillWave)) {
    assert.ok(agentId !== 'production-orchestrator' || bundle.length >= 10);
    assert.ok(bundle.length >= 11 && bundle.length <= 15, `${agentId} has ${bundle.length}`);
    assert.equal(new Set(bundle).size, bundle.length);
    assert.ok(bundle.every((id) => CUSTOM_SKILL_IDS.includes(id)));
    assert.ok(bundle.includes('mansoor-grounded-claims'), `${agentId} must carry the claim evidence contract`);
  }
});

test('adds narrow domain skills to agents whose current custom capsules are too generic', () => {
  assert.ok(customSkillsForAgent('deployment-release-specialist').includes('mansoor-deployment-readiness'));
  assert.ok(customSkillsForAgent('deployment-release-specialist').includes('mansoor-release-rollback'));
  assert.ok(customSkillsForAgent('research-docs-specialist').includes('mansoor-source-conflict-resolution'));
  assert.ok(customSkillsForAgent('open-source-commerce-researcher').includes('mansoor-oss-repository-archaeology'));
  assert.ok(customSkillsForAgent('learning-mentor-specialist').includes('mansoor-learning-calibration'));
  assert.ok(customSkillsForAgent('ecommerce-ecosystem-gap-analyst').includes('mansoor-product-gap-evidence'));
  assert.ok(customSkillsForAgent('web-audit-specialist').includes('mansoor-seo-live-audit'));
  assert.ok(customSkillsForAgent('agent-hub-maintainer').includes('mansoor-antigravity-native-sync'));
  assert.ok(customSkillsForAgent('production-orchestrator').includes('mansoor-antigravity-native-sync'));
});

test('native sync skill makes CLI state and process locks explicit without force-closing Antigravity', async () => {
  const skill = await fs.readFile(path.join(root, 'skills', 'mansoor-antigravity-native-sync', 'SKILL.md'), 'utf8');
  for (const term of ['agy plugin list --json', 'plugin validate --strict', 'host-active', 'defer', 'exit code 42', 'never stop Antigravity']) {
    assert.ok(skill.toLowerCase().includes(term.toLowerCase()), `missing sync safeguard: ${term}`);
  }
});

test('grounded claims and deployment skills enforce observable evidence rather than confidence language', async () => {
  const claims = await fs.readFile(path.join(root, 'skills', 'mansoor-grounded-claims', 'SKILL.md'), 'utf8');
  const deploy = await fs.readFile(path.join(root, 'skills', 'mansoor-deployment-readiness', 'SKILL.md'), 'utf8');
  for (const label of ['Observed', 'Source-verified', 'Inferred', 'Unknown', 'Not run / blocked']) assert.ok(claims.includes(label), `missing evidence class ${label}`);
  for (const gate of ['artifact/image digest', 'environment', 'migration', 'approval', 'rollback', 'READY', 'BLOCKED', 'NOT RUN']) assert.ok(deploy.toLowerCase().includes(gate.toLowerCase()), `missing deployment gate ${gate}`);
});

test('manager remains the only profile allowed to delegate', () => {
  assert.ok(customSkillsForAgent('production-orchestrator').includes('mansoor-parallel-handoff'));
  assert.equal(customSkillsForAgent('qa-release-specialist').includes('mansoor-seo-live-audit'), true);
});

test('every shipped profile declares a bounded additive custom capsule including grounded claims', async () => {
  const profiles = await fs.readdir(path.join(root, 'agents', 'Antigravity', 'custom-agents'), { withFileTypes: true });
  const missingBundles = [];
  for (const entry of profiles.filter((item) => item.isDirectory())) {
    const file = path.join(root, 'agents', 'Antigravity', 'custom-agents', entry.name, 'agent.md');
    const text = await fs.readFile(file, 'utf8');
    if (!Object.hasOwn(customSkillWave, entry.name)) missingBundles.push(entry.name);
    const refs = [...text.matchAll(/^\s*- skills\/([a-z0-9-]+)\s*$/gm)].map((match) => match[1]).filter((name) => CUSTOM_SKILL_IDS.includes(name));
    assert.ok(refs.length >= 11 && refs.length <= 15, `${entry.name} has ${refs.length}`);
    assert.equal(new Set(refs).size, refs.length);
    assert.ok(refs.includes('mansoor-grounded-claims'), `${entry.name} must carry grounded-claims`);
  }
  assert.deepEqual(missingBundles, [], 'every shipped profile must receive a custom-skill bundle');
});

test('Node profile loads the existing Node deployment skill and release specialist exists as a non-manager', async () => {
  const profilesRoot = path.join(root, 'agents', 'Antigravity', 'custom-agents');
  const nodeProfile = await fs.readFile(path.join(profilesRoot, 'node-backend-specialist', 'agent.md'), 'utf8');
  const deployProfile = await fs.readFile(path.join(profilesRoot, 'deployment-release-specialist', 'agent.md'), 'utf8');
  assert.match(nodeProfile, /^\s*- skills\/node-deployment-delivery\s*$/m);
  assert.match(deployProfile, /^mainAgent:\s*false\s*$/m);
  assert.match(deployProfile, /deployment-release-specialist/);
  assert.doesNotMatch(deployProfile, /^\s*- invoke_subagent\s*$/m);
});

test('every specialist carries the final outcome report contract with work-specific evidence', async () => {
  const profilesRoot = path.join(root, 'agents', 'Antigravity', 'custom-agents');
  for (const entry of (await fs.readdir(profilesRoot, { withFileTypes: true })).filter((item) => item.isDirectory())) {
    const profile = await fs.readFile(path.join(profilesRoot, entry.name, 'agent.md'), 'utf8');
    assert.match(profile, /^\s*- skills\/mansoor-evidence-loop\s*$/m, `${entry.name} must use the shared evidence loop`);
    assert.match(profile, /^\s*- skills\/claude-style-response-quality\s*$/m, `${entry.name} must use the shared final response contract`);
  }
  const contract = await fs.readFile(path.join(root, 'skills', 'claude-style-response-quality', 'SKILL.md'), 'utf8');
  for (const section of ['Starting point and goal', 'What changed or was learned', 'Evidence and verification', 'Remaining gaps', 'Next-level opportunities']) {
    assert.ok(contract.includes(section), `missing response section: ${section}`);
  }
});

test('Codex sync installs the wave and preserves unrelated collisions', async () => {
  assert.ok(CODEX_CUSTOM_SKILL_IDS.includes('project-context-orchestrator'));
  const target = await fs.mkdtemp(path.join(os.tmpdir(), 'mansoor-codex-skills-'));
  const stateFile = path.join(target, 'state.json');
  try {
    const state = await syncCustomSkills({ sourceRoot: root, targetRoot: target, stateFile });
    assert.equal(state.skills.length, CODEX_CUSTOM_SKILL_IDS.length);
    await fs.mkdir(path.join(target, 'mansoor-task-contract'), { recursive: true });
    await fs.writeFile(path.join(target, 'mansoor-task-contract', 'SKILL.md'), 'unrelated');
    const updated = await syncCustomSkills({ sourceRoot: root, targetRoot: target, stateFile });
    assert.ok(updated.skipped.some((entry) => entry.id === 'mansoor-task-contract'));
    assert.equal(await fs.readFile(path.join(target, 'mansoor-task-contract', 'SKILL.md'), 'utf8'), 'unrelated');
    assert.ok(await fs.readFile(path.join(target, 'mansoor-ui-component-alignment', 'SKILL.md'), 'utf8'));
  } finally {
    await fs.rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test('Codex installer CLI compares Windows paths with fileURLToPath', async () => {
  const source = await fs.readFile(path.join(root, 'tools', 'install-codex-custom-skills.mjs'), 'utf8');
  assert.match(source, /fileURLToPath\(import\.meta\.url\)/);
  assert.doesNotMatch(source, /path\.resolve\(new URL\(import\.meta\.url\)\.pathname\)/);
});
