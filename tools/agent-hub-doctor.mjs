#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { inspectPortableSource, readAgentSkillReferences } from './portable-components.mjs';
import { validateRuleRegistry } from './rule-governance.mjs';
import { canonicalContentBytes } from './content-hash.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shippedAgents = [
  'agent-hub-maintainer', 'application-security-reviewer', 'cloud-data-engineer',
  'dotnet-backend-specialist', 'enterprise-schema-architect', 'flutter-mobile-specialist',
  'mansoor-ui-specialist', 'ml-systems-specialist', 'node-backend-specialist',
  'production-orchestrator', 'python-backend-specialist', 'qa-release-specialist',
  'research-docs-specialist', 'saas-architect', 'workflow-automation-specialist',
];
const excludedAgents = ['live-web-auditor', 'omniroute-gateway-operator'];

function checksumReport() {
  const records = JSON.parse(fs.readFileSync(path.join(root, 'KEY-CHECKSUMS.json'), 'utf8'));
  const errors = [];
  let checked = 0;
  let skipped = 0;
  for (const record of records) {
    if (typeof record?.Path !== 'string' || !/^[A-F0-9]{64}$/i.test(record?.SHA256) || !Number.isInteger(record?.Bytes)) {
      errors.push('Checksum manifest has a malformed record');
      continue;
    }
    const relative = record.Path.replaceAll('\\', '/').replace(/^Agents\//, '');
    if (/(?:^|\/)(?:shared\/native-profile|shared\/private-backup|shared\/knowledge\/readable-chat-context)(?:\/|$)|\.(?:db|sqlite|zip)$/i.test(relative)) {
      skipped += 1;
      continue;
    }
    const resolved = path.resolve(root, relative);
    if (!resolved.startsWith(`${root}${path.sep}`)) {
      errors.push(`Manifest path escapes hub: ${record.Path}`);
      continue;
    }
    let bytes;
    try { bytes = fs.readFileSync(resolved); } catch {
      errors.push(`Manifest file is missing: ${record.Path}`);
      continue;
    }
    const canonical = canonicalContentBytes(bytes, relative);
    const hash = crypto.createHash('sha256').update(canonical).digest('hex').toUpperCase();
    if (hash !== record.SHA256 || canonical.length !== record.Bytes) errors.push(`Manifest mismatch: ${record.Path}`);
    checked += 1;
  }
  return { errors, checked, skipped };
}

function provenanceReport(portable) {
  const file = path.join(root, 'SKILL-PROVENANCE.json');
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { return { errors: [`Skill provenance ledger unreadable: ${error.message}`], reviewRequired: 0 }; }
  const entries = Array.isArray(manifest.skills) ? manifest.skills : [];
  const names = entries.map((entry) => entry?.name);
  const errors = [];
  if (manifest?.policy?.packageDistribution !== 'private-only') errors.push('Skill provenance policy must remain private-only');
  if (entries.length !== portable.skills.length) errors.push(`Skill provenance ledger covers ${entries.length} skills, expected ${portable.skills.length}`);
  if (new Set(names).size !== names.length) errors.push('Skill provenance ledger contains duplicate names');
  for (const name of portable.skills) {
    const entry = entries.find((candidate) => candidate?.name === name);
    if (!entry) errors.push(`Skill provenance missing: ${name}`);
    else if (!Array.isArray(entry.sourceRoots) || !entry.sourceRoots.length) errors.push(`Skill provenance has no source roots: ${name}`);
  }
  return { errors, reviewRequired: entries.filter((entry) => entry?.publicReleaseReviewRequired).length };
}

export async function runDoctor() {
  const checks = [];
  const add = (status, name, detail) => checks.push({ status, name, detail });
  const profilesRoot = path.join(root, 'agents', 'Antigravity', 'custom-agents');
  const mainText = fs.readFileSync(path.join(profilesRoot, 'production-orchestrator', 'agent.md'), 'utf8');
  if (/^mainAgent:\s*true\s*$/m.test(mainText) && /^model:\s*inherit\s*$/m.test(mainText)) {
    add('PASS', 'single Gemini manager', 'production-orchestrator is the only shipped manager and inherits the target Antigravity model');
  } else add('FAIL', 'single Gemini manager', 'manager profile is missing inherit-model or main-manager metadata');

  const found = fs.readdirSync(profilesRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const missing = shippedAgents.filter((name) => !found.includes(name) || !fs.existsSync(path.join(profilesRoot, name, 'agent.md')));
  const extra = found.filter((name) => !shippedAgents.includes(name) && !excludedAgents.includes(name));
  if (!missing.length && !extra.length) add('PASS', 'expert team inventory', `${shippedAgents.length} manager/specialist profiles are present in the portable allowlist`);
  else add('FAIL', 'expert team inventory', `missing=[${missing.join(', ')}], unexpected=[${extra.join(', ')}]`);

  const badModelProfiles = shippedAgents.filter((name) => {
    const text = fs.readFileSync(path.join(profilesRoot, name, 'agent.md'), 'utf8');
    return !/^model:\s*inherit\s*$/m.test(text) || (name !== 'production-orchestrator' && /^mainAgent:\s*true\s*$/m.test(text));
  });
  if (!badModelProfiles.length) add('PASS', 'specialist inheritance', 'all specialists inherit Gemini and cannot become additional managers');
  else add('FAIL', 'specialist inheritance', `invalid profile metadata: ${badModelProfiles.join(', ')}`);

  const packer = fs.readFileSync(path.join(root, 'tools', 'build-antigravity-plugin.mjs'), 'utf8');
  const excluded = excludedAgents.filter((name) => !packer.includes(name));
  const forbiddenDefinitions = /mcpServers|oauthClients|"type"\s*:\s*"mcp"/i.test(packer);
  if (!excluded.length && !forbiddenDefinitions && /copyPortableComponents/.test(packer)) {
    add('PASS', 'self-contained package policy', 'packer excludes provider connectors and bundles the approved local skill/rule library');
  } else add('FAIL', 'self-contained package policy', `excluded rules missing=[${excluded.join(', ')}], connector definitions present=${forbiddenDefinitions}`);

  const portable = await inspectPortableSource(root);
  const ruleRegistry = JSON.parse(fs.readFileSync(path.join(root, 'shared', 'control-plane', 'rule-registry.json'), 'utf8'));
  const ruleRegistryReport = await validateRuleRegistry(ruleRegistry, { root });
  if (ruleRegistryReport.valid) add('PASS', 'governed rule registry', `${ruleRegistry.rules.length} versioned rules have valid metadata and matching SHA-256 content hashes`);
  else add('FAIL', 'governed rule registry', [...ruleRegistryReport.errors, ...ruleRegistryReport.hashMismatches.map((file) => `content hash mismatch: ${file}`)].join('; '));
  const skillReferences = await readAgentSkillReferences(root);
  const missingSkillBodies = [...new Set(skillReferences.filter((name) => !portable.skills.includes(name)))].sort();
  if (portable.skills.length === 179 && portable.rules.length === 4
      && !portable.invalidSkills.length && !portable.invalidRules.length
      && !portable.nestedSkillFiles.length && !portable.unsafePaths.length
      && !portable.brokenLocalReferences.length && !portable.provenanceGaps.length
      && !missingSkillBodies.length) {
    add('PASS', 'portable skills and rules', `${portable.skills.length} skills and ${portable.rules.length} rules are valid; all ${skillReferences.length} agent references resolve locally`);
  } else {
    add('FAIL', 'portable skills and rules', `skills=${portable.skills.length}, rules=${portable.rules.length}, invalidSkills=[${portable.invalidSkills.join(', ')}], invalidRules=[${portable.invalidRules.join(', ')}], nested=[${portable.nestedSkillFiles.join(', ')}], unsafe=[${portable.unsafePaths.join(', ')}], brokenRefs=[${portable.brokenLocalReferences.join(', ')}], provenance=[${portable.provenanceGaps.join(', ')}], missing=[${missingSkillBodies.join(', ')}]`);
  }

  const provenance = provenanceReport(portable);
  if (provenance.errors.length) add('FAIL', 'skill provenance ledger', provenance.errors.join('; '));
  else add('PASS', 'skill provenance ledger', `${portable.skills.length} skills mapped to source categories; ${provenance.reviewRequired} remain private-only pending public licence/source review`);

  const forbiddenProfiles = shippedAgents.filter((name) => {
    const text = fs.readFileSync(path.join(profilesRoot, name, 'agent.md'), 'utf8');
    return /(?:^|\n)\s*-\s*(?:browser|mcp__|oauth|provider[_-]bridge)/i.test(text);
  });
  if (!forbiddenProfiles.length) add('PASS', 'agent tool boundary', 'shipped agent profiles do not declare external connector tools');
  else add('FAIL', 'agent tool boundary', `external tool declarations found in: ${forbiddenProfiles.join(', ')}`);

  const nestedDelegators = shippedAgents.filter((name) => name !== 'production-orchestrator').filter((name) => {
    const text = fs.readFileSync(path.join(profilesRoot, name, 'agent.md'), 'utf8');
    return /^\s*-\s*invoke_subagent\s*$/m.test(text);
  });
  const managerDelegates = /^\s*-\s*invoke_subagent\s*$/m.test(mainText);
  const managerGeneratesImages = /^\s*-\s*generate_image\s*$/m.test(mainText);
  if (managerDelegates && !managerGeneratesImages && !nestedDelegators.length) {
    add('PASS', 'manager-only delegation policy', 'only production-orchestrator can delegate; image generation remains specialist-owned');
  } else {
    add('FAIL', 'manager-only delegation policy', `managerDelegates=${managerDelegates}, managerGeneratesImages=${managerGeneratesImages}, nestedDelegators=[${nestedDelegators.join(', ')}]`);
  }

  const missingReverseEngineering = shippedAgents.filter((name) => {
    const text = fs.readFileSync(path.join(profilesRoot, name, 'agent.md'), 'utf8');
    return !/skills\/reverse-engineering/.test(text);
  });
  if (!missingReverseEngineering.length) add('PASS', 'reverse-engineering gate', 'every shipped manager/specialist declares the reverse-engineering skill');
  else add('FAIL', 'reverse-engineering gate', `missing from: ${missingReverseEngineering.join(', ')}`);

  const missingQualityContract = shippedAgents.filter((name) => {
    const text = fs.readFileSync(path.join(profilesRoot, name, 'agent.md'), 'utf8');
    return !/skills\/production-code-quality/.test(text) || !/skills\/claude-style-response-quality/.test(text);
  });
  if (!missingQualityContract.length) {
    add('PASS', 'specialist quality contract', 'every shipped manager/specialist loads production-code-quality and claude-style-response-quality');
  } else add('FAIL', 'specialist quality contract', `missing from: ${missingQualityContract.join(', ')}`);

  const uiText = fs.readFileSync(path.join(profilesRoot, 'mansoor-ui-specialist', 'agent.md'), 'utf8');
  const researchText = fs.readFileSync(path.join(profilesRoot, 'research-docs-specialist', 'agent.md'), 'utf8');
  if (/search_web/.test(uiText) && /read_url_content/.test(uiText) && /generate_image/.test(uiText)
      && /search_web/.test(researchText) && /read_url_content/.test(researchText)) {
    add('PASS', 'research and UI capability', 'UI and research specialists expose bounded reference research; UI exposes approved image generation');
  } else add('FAIL', 'research and UI capability', 'required research/image tools are missing from the specialist contracts');

  const flutterText = fs.readFileSync(path.join(profilesRoot, 'flutter-mobile-specialist', 'agent.md'), 'utf8');
  const flutterGate = [
    /flutter-ui-ux/i,
    /flutter-production-layout-qa/i,
    /android-design/i,
    /60fps/i,
    /text scaling/i,
    /compact-phone.*standard-phone.*tablet/i,
    /loading\/error.*permission/i,
    /golden|widget.*integration/i,
    /preserve existing business logic/i,
  ];
  if (flutterGate.every((pattern) => pattern.test(flutterText))) {
    add('PASS', 'Flutter/Android specialist capability', 'Flutter specialist covers adaptive UI, 60fps performance, accessibility, state coverage and regression-safe implementation');
  } else add('FAIL', 'Flutter/Android specialist capability', 'Flutter specialist is missing one or more expert UI, performance, accessibility or verification requirements');

  const uiLayoutGate = [
    /Layout integrity acceptance gate/i,
    /fixed heights on text-bearing containers/i,
    /min-width: `?0/i,
    /overflow-wrap: `?anywhere/i,
    /200% zoom/i,
    /light and dark themes independently/i,
    /real browser or equivalent project preview/i,
  ];
  if (uiLayoutGate.every((pattern) => pattern.test(uiText))) {
    add('PASS', 'UI layout integrity gate', 'UI specialist enforces overflow, responsive, theme and rendered-browser acceptance checks');
  } else add('FAIL', 'UI layout integrity gate', 'UI specialist is missing one or more clipping, responsive, theme or rendered-verification rules');

  const ultraRuntimeFiles = [
    'tools/ultra-agent-v2/preflight.mjs',
    'tools/ultra-agent-v2/memory.mjs',
    'tools/ultra-agent-v2/evidence.mjs',
    'tools/ultra-agent-v2/project-identity.mjs',
    'tools/ultra-agent-v2/rag.mjs',
    'shared/ULTRA_AGENT_V2_PROTOCOL.md',
    'tools/ultra-agent-v2/contract.mjs',
  ];
  const missingUltraRuntime = ultraRuntimeFiles.filter((relative) => !fs.existsSync(path.join(root, relative)));
  if (!missingUltraRuntime.length && /tools\/ultra-agent-v2\/preflight\.mjs/.test(mainText)
      && /tools\/ultra-agent-v2\/memory\.mjs/.test(mainText)
      && /tools\/ultra-agent-v2\/evidence\.mjs/.test(mainText)
      && /tools\/ultra-agent-v2\/contract\.mjs/.test(mainText)
      && ['plan', 'flow', 'status', 'logic', 'requirements', 'test-cases'].every((folder) => mainText.includes(`\`${folder}/\``))) {
    add('PASS', 'Ultra Agent v2 runtime', 'project preflight, local memory, contract kernel and research/verification ledgers are present and manager-routable');
  } else add('FAIL', 'Ultra Agent v2 runtime', `missing=[${missingUltraRuntime.join(', ')}] or manager routing is incomplete`);

  const ultraV3Files = [
    'tools/ultra-agent-v3/state.mjs',
    'tools/ultra-agent-v3/mode.mjs',
    'tools/ultra-agent-v3/plan.mjs',
    'tools/ultra-agent-v3/context.mjs',
    'tools/ultra-agent-v3/evaluate.mjs',
    'tools/ultra-agent-v3/trace.mjs',
    'tools/ultra-agent-v3/delegation.mjs',
    'tools/ultra-agent-v3/policy.mjs',
    'tools/ultra-agent-v3/activity.mjs',
  ];
  const missingUltraV3 = ultraV3Files.filter((relative) => !fs.existsSync(path.join(root, relative)));
  const v3Routes = [/tools\/ultra-agent-v3\/mode\.mjs/, /tools\/ultra-agent-v3\/state\.mjs/, /tools\/ultra-agent-v3\/evaluate\.mjs/];
  if (!missingUltraV3.length && v3Routes.every((pattern) => pattern.test(mainText))) {
    add('PASS', 'Ultra Agent v3 control plane', 'Fast/Premium routing, resumable state, context, evaluation and trace utilities are present and manager-routable');
  } else add('FAIL', 'Ultra Agent v3 control plane', `missing=[${missingUltraV3.join(', ')}] or manager routing is incomplete`);

  const ultraV4Files = [
    'tools/ultra-agent-v4/benchmark.mjs',
    'tools/ultra-agent-v4/recovery.mjs',
  ];
  const missingUltraV4 = ultraV4Files.filter((relative) => !fs.existsSync(path.join(root, relative)));
  const v4Routes = [
    /tools\/ultra-agent-v4\/benchmark\.mjs/,
    /tools\/ultra-agent-v4\/recovery\.mjs/,
    /tools\/ultra-agent-v3\/activity\.mjs/,
    /activity\.mjs summary/,
  ];
  if (!missingUltraV4.length && v4Routes.every((pattern) => pattern.test(mainText))) {
    add('PASS', 'Ultra Agent v4 adaptive runtime', 'benchmark metrics, targeted recovery and native activity runtime are present and manager-routable');
  } else add('FAIL', 'Ultra Agent v4 adaptive runtime', `missing=[${missingUltraV4.join(', ')}] or manager routing is incomplete`);

  const managedRuntimeFiles = [
    'tools/ultra-agent-v4/managed-runtime.mjs',
    'tools/antigravity-runtime-preflight.mjs',
    'tools/antigravity-pretool-guard.ps1',
    'tools/content-hash.mjs',
    'tools/run-agent-security-fixtures.mjs',
    'tools/security-agent-fixtures.json',
    'tools/sync-global-rules.ps1',
    '.github/workflows/quality.yml',
  ];
  const missingManagedRuntime = managedRuntimeFiles.filter((relative) => !fs.existsSync(path.join(root, relative)));
  const managedRuntimeRoutes = [
    /managed-runtime\.mjs/,
    /trusted `approvePlan` callback/,
    /PreToolUse hook/i,
    /native IDE changes do not enter the Node effect ledger/i,
    /antigravity-runtime-preflight\.mjs/,
  ];
  const buildScript = fs.readFileSync(path.join(root, 'tools', 'build-antigravity-plugin.mjs'), 'utf8');
  if (!missingManagedRuntime.length && managedRuntimeRoutes.every((pattern) => pattern.test(mainText)) && /PreToolUse/.test(buildScript) && /hooks\.json/.test(buildScript)) {
    add('PASS', 'managed runtime and native host guard', 'managed executor, packaged PreToolUse guard, host preflight, security fixtures and CI are present; native side effects remain outside the Node ledger');
  } else add('FAIL', 'managed runtime and honest host boundary', `missing=[${missingManagedRuntime.join(', ')}] or manager host-boundary routing is incomplete`);

  const nativeActivityReady = /invoke_subagent/i.test(mainText)
    && /native sub-agent panel/i.test(mainText)
    && /do not direct the user to a separate browser dashboard/i.test(mainText);
  if (nativeActivityReady) {
    add('PASS', 'Ultra Agent v4 native activity', 'parent chat and Antigravity native sub-agent panel are the live activity surface; standalone browser dashboard is retired');
  } else add('FAIL', 'Ultra Agent v4 native activity', 'manager profile is missing the native activity contract');

  const integrity = checksumReport();
  if (integrity.errors.length) add('FAIL', 'source integrity', integrity.errors.join('; '));
  else add('PASS', 'source integrity', `${integrity.checked} checksums verified; ${integrity.skipped} private/bulk archive checksums skipped`);

  const failures = checks.filter((item) => item.status === 'FAIL').length;
  return { ok: failures === 0, failures, warnings: 0, checks };
}

async function main() {
  const args = process.argv.slice(2);
  const formatIndex = args.indexOf('--format');
  const format = formatIndex >= 0 ? args[formatIndex + 1] : 'text';
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Agent Hub Doctor (read-only; E:\\Agents source only; no user profile or provider calls)');
    console.log('Usage: node tools/agent-hub-doctor.mjs [--format text|json]');
    return;
  }
  if (args.some((arg, index) => arg === '--root' || arg === '--user-profile')) throw new Error('This doctor is scoped to its own E:\\Agents checkout.');
  if (!['text', 'json'].includes(format)) throw new Error('--format must be text or json');
  const report = await runDoctor();
  if (format === 'json') console.log(JSON.stringify(report, null, 2));
  else {
    for (const item of report.checks) console.log(`[${item.status}] ${item.name}: ${item.detail}`);
    console.log(`Result: ${report.failures} fail, ${report.warnings} warning`);
  }
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(); } catch (error) {
    console.error(`Agent Hub Doctor: ${error.message}`);
    process.exitCode = 2;
  }
}
