import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertAgentProfile, convertRuleProfile, convertSkillProfile, discoverTeamSources, managerInstructions, runVerifiedSync, syncGeminiTeam } from '../install-gemini-cli-team.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('discovers both repository and signed-package layouts for team profiles and full skills', () => {
  assert.deepEqual(discoverTeamSources(root), {
    agents: path.join(root, 'agents', 'Antigravity', 'custom-agents'),
    skills: path.join(root, 'skills'),
    rules: path.join(root, 'rules'),
  });
});

test('discovers the flattened agent and full-skill layout inside a signed package', () => {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mam-package-layout-'));
  try {
    fs.mkdirSync(path.join(packageRoot, 'agents'));
    fs.mkdirSync(path.join(packageRoot, 'skill-library', 'example-skill'), { recursive: true });
    fs.mkdirSync(path.join(packageRoot, 'rules'));
    fs.writeFileSync(path.join(packageRoot, 'agents', 'mansoor-ai-team-manager.md'), '---\nname: Mansoor AI Team Manager\n---\n');
    fs.writeFileSync(path.join(packageRoot, 'skill-library', 'example-skill', 'SKILL.md'), '---\nname: example-skill\ndescription: Example\n---\n');
    fs.writeFileSync(path.join(packageRoot, 'rules', 'example.md'), '---\ndescription: Example policy\n---\n');
    assert.deepEqual(discoverTeamSources(packageRoot), {
      agents: path.join(packageRoot, 'agents'),
      skills: path.join(packageRoot, 'skill-library'),
      rules: path.join(packageRoot, 'rules'),
    });
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }
});

test('installs a namespaced Gemini skill without changing its instructions or resources', () => {
  const source = `---\nname: impeccable\ndescription: Use for detailed design.\n---\n# Design rules\nPreserve the source body.`;
  const converted = convertSkillProfile(source, { directoryName: 'impeccable' });
  assert.match(converted, /^---\nname: mam-impeccable\ndescription: Use for detailed design\.\n---\n<!-- managed-by: mansoor-agent-hub-gemini-cli -->/);
  assert.match(converted, /# Design rules\nPreserve the source body\./);
});

test('converts each domain policy into a globally discoverable MAM skill', () => {
  const source = `---\ntrigger: model_decision\ndescription: Apply for production architecture work.\n---\n# Architecture policy\nPreserve verified contracts.`;
  const converted = convertRuleProfile(source, { fileName: 'architecture-governance.md' });
  assert.match(converted, /^---\nname: mam-policy-architecture-governance\ndescription: Apply for production architecture work\.\n---\n<!-- managed-by: mansoor-agent-hub-gemini-cli -->/);
  assert.match(converted, /# Architecture policy\nPreserve verified contracts\./);
});

test('syncs a complete team idempotently and prunes only unchanged stale managed skills', () => {
  const baseRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mam-sync-source-'));
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'mam-sync-target-'));
  const agentRoot = path.join(baseRoot, 'agents', 'Antigravity', 'custom-agents');
  const skillRoot = path.join(baseRoot, 'skills');
  const ruleRoot = path.join(baseRoot, 'rules');
  const makeSkill = (name) => {
    fs.mkdirSync(path.join(skillRoot, name), { recursive: true });
    fs.writeFileSync(path.join(skillRoot, name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name} work.\n---\n# ${name}\nUse this skill.`);
  };
  try {
    fs.mkdirSync(agentRoot, { recursive: true });
    fs.mkdirSync(skillRoot, { recursive: true });
    fs.mkdirSync(ruleRoot, { recursive: true });
    for (let index = 0; index < 15; index += 1) {
      const manager = index === 0;
      const folder = manager ? 'manager' : `specialist-${index}`;
      fs.mkdirSync(path.join(agentRoot, folder), { recursive: true });
      const skillList = manager ? 'skills:\n  - skills/skill-000\n' : '';
      fs.writeFileSync(path.join(agentRoot, folder, 'agent.md'), `---\nname: ${manager ? 'Mansoor AI Team Manager' : folder}\ndescription: ${folder}\n${skillList}---\n# ${folder}\n${folder} instructions.`);
    }
    for (let index = 0; index < 179; index += 1) makeSkill(`skill-${String(index).padStart(3, '0')}`);
    for (let index = 0; index < 4; index += 1) fs.writeFileSync(path.join(ruleRoot, `policy-${index}.md`), `---\ndescription: Policy ${index} applies.\n---\n# Policy ${index}\nApply this policy.`);

    assert.match(syncGeminiTeam({ baseRoot, target }), /14 specialists, 179 full skills and 4 governed policies/);
    const staleSkill = path.join(target, 'skills', 'mam-skill-178', 'SKILL.md');
    fs.appendFileSync(staleSkill, '\nUser customization preserved.');
    fs.rmSync(path.join(skillRoot, 'skill-178'), { recursive: true, force: true });
    makeSkill('skill-replacement');
    assert.match(syncGeminiTeam({ baseRoot, target }), /14 specialists, 179 full skills and 4 governed policies/);
    assert.ok(fs.existsSync(staleSkill), 'locally edited stale skill is preserved');
    assert.ok(fs.existsSync(path.join(target, 'skills', 'mam-skill-replacement', 'SKILL.md')));
    assert.equal(syncGeminiTeam({ baseRoot, target, check: true }), 'Gemini CLI Mansoor team is current: 15 agent profiles, 179 skills, 4 governed policies and global manager instructions.');

    fs.rmSync(staleSkill);
    fs.rmSync(path.join(baseRoot, 'skills', 'skill-177'), { recursive: true, force: true });
    makeSkill('skill-replacement-two');
    syncGeminiTeam({ baseRoot, target });
    assert.equal(fs.existsSync(path.join(target, 'skills', 'mam-skill-177')), false, 'unchanged stale managed skill is pruned');
  } finally {
    fs.rmSync(baseRoot, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('automatically retries one failed install verification and reports the final attempt', () => {
  const events = [];
  let installAttempts = 0;
  let verificationAttempts = 0;
  const result = runVerifiedSync({
    sync: () => { installAttempts += 1; events.push(`install-${installAttempts}`); return `installed-${installAttempts}`; },
    verify: () => {
      verificationAttempts += 1;
      events.push(`verify-${verificationAttempts}`);
      if (verificationAttempts === 1) throw new Error('first verification mismatch');
      return 'verified-current';
    },
    onRetry: () => events.push('automatic-repair'),
  });

  assert.equal(installAttempts, 2);
  assert.equal(verificationAttempts, 2);
  assert.deepEqual(events, ['install-1', 'verify-1', 'automatic-repair', 'install-2', 'verify-2']);
  assert.deepEqual(result, { installed: 'installed-2', verified: 'verified-current', attempts: 2 });
});

test('stops after one automatic repair and reports both failed verification attempts', () => {
  let installAttempts = 0;
  let verificationAttempts = 0;
  assert.throws(() => runVerifiedSync({
    sync: () => { installAttempts += 1; return 'installed'; },
    verify: () => { verificationAttempts += 1; throw new Error(`mismatch-${verificationAttempts}`); },
  }), /Gemini CLI team verification failed after 2 attempts[\s\S]*mismatch-1[\s\S]*mismatch-2/);
  assert.equal(installAttempts, 2);
  assert.equal(verificationAttempts, 2);
});

test('converts Antigravity agent frontmatter to a Gemini CLI local subagent with the MAM slug', () => {
  const source = `---\nname: Mansoor AI Team Manager\ndescription: Primary manager\nmodel: inherit\nmainAgent: true\nsubagent: true\ntools:\n  - view_file\n  - run_command\n  - invoke_subagent\nskills:\n  - skills/reverse-engineering\n---\n# Mansoor AI Team Manager\nInternal routing id: production-orchestrator.\nUse Antigravity invoke_subagent.`;
  const converted = convertAgentProfile(source, { slug: 'mansoor-ai-team-manager', isManager: true });
  assert.match(converted, /^---\nname: mansoor-ai-team-manager\ndescription: Primary manager for coordinating the Mansoor AI Team[\s\S]*?---\n<!-- managed-by: mansoor-agent-hub-gemini-cli -->/);
  assert.match(converted, /You are Mansoor AI Team Manager/);
  assert.match(converted, /mam-reverse-engineering/);
  assert.match(converted, /timeout_mins: 10/);
  assert.match(converted, /tools:\n  - read_file\n  - run_shell_command/);
  assert.doesNotMatch(converted, /invoke_subagent/);
  assert.doesNotMatch(converted, /skills\/reverse-engineering/);
  assert.doesNotMatch(converted, /production-orchestrator|invoke_subagent|mainAgent:|subagent:/);
});

test('replaces legacy provider-routing blocks and preserves unrelated Gemini instructions', () => {
  const original = `Keep this custom rule.\n\n## Autonomous Multi-Agent & Language Protocol\nUse DeepSeek and Hermes with API keys.\n<!-- agents-hub-manager-routing -->\nUse production-orchestrator.\n<!-- /agents-hub-manager-routing -->\n<!-- context7 -->\nKeep Context7.`;
  const updated = managerInstructions(original);
  assert.match(updated, /Keep this custom rule\./);
  assert.match(updated, /<!-- context7 -->\nKeep Context7\./);
  assert.match(updated, /Mansoor AI Team Manager/);
  assert.match(updated, /mam-policy-antigravity-native-orchestration/);
  assert.match(updated, /permission mode, approval settings and safety controls/);
  assert.doesNotMatch(updated, /production-orchestrator|agents-hub-manager-routing/);
  assert.equal(managerInstructions(updated), updated);
});

test('default owner builds sync Gemini CLI while package-only builds stay side-effect free', () => {
  const build = fs.readFileSync(path.join(root, 'build-agent-hub.ps1'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.match(build, /if \(-not \$SkipAutoInstall\)[\s\S]*?install-gemini-cli-team\.mjs/);
  assert.equal(pkg.scripts['agents:install:gemini'], 'node tools/install-gemini-cli-team.mjs --verified-sync');
  assert.equal(pkg.scripts['agents:check:gemini'], 'node tools/install-gemini-cli-team.mjs --check');
  assert.match(pkg.scripts['build:package'], /-SkipAutoInstall/);
});
