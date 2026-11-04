#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { inspectPortableSource, readAgentSkillReferences } from './portable-components.mjs';

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
    const hash = crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
    if (hash !== record.SHA256 || bytes.length !== record.Bytes) errors.push(`Manifest mismatch: ${record.Path}`);
    checked += 1;
  }
  return { errors, checked, skipped };
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
  const skillReferences = await readAgentSkillReferences(root);
  const missingSkillBodies = [...new Set(skillReferences.filter((name) => !portable.skills.includes(name)))].sort();
  if (portable.skills.length === 171 && portable.rules.length === 4
      && !portable.invalidSkills.length && !portable.invalidRules.length
      && !portable.nestedSkillFiles.length && !portable.unsafePaths.length
      && !portable.brokenLocalReferences.length && !portable.provenanceGaps.length
      && !missingSkillBodies.length) {
    add('PASS', 'portable skills and rules', `${portable.skills.length} skills and ${portable.rules.length} rules are valid; all ${skillReferences.length} agent references resolve locally`);
  } else {
    add('FAIL', 'portable skills and rules', `skills=${portable.skills.length}, rules=${portable.rules.length}, invalidSkills=[${portable.invalidSkills.join(', ')}], invalidRules=[${portable.invalidRules.join(', ')}], nested=[${portable.nestedSkillFiles.join(', ')}], unsafe=[${portable.unsafePaths.join(', ')}], brokenRefs=[${portable.brokenLocalReferences.join(', ')}], provenance=[${portable.provenanceGaps.join(', ')}], missing=[${missingSkillBodies.join(', ')}]`);
  }

  const forbiddenProfiles = shippedAgents.filter((name) => {
    const text = fs.readFileSync(path.join(profilesRoot, name, 'agent.md'), 'utf8');
    return /(?:^|\n)\s*-\s*(?:browser|mcp__|oauth|provider[_-]bridge)/i.test(text);
  });
  if (!forbiddenProfiles.length) add('PASS', 'agent tool boundary', 'shipped agent profiles do not declare external connector tools');
  else add('FAIL', 'agent tool boundary', `external tool declarations found in: ${forbiddenProfiles.join(', ')}`);

  const missingReverseEngineering = shippedAgents.filter((name) => {
    const text = fs.readFileSync(path.join(profilesRoot, name, 'agent.md'), 'utf8');
    return !/skills\/reverse-engineering/.test(text);
  });
  if (!missingReverseEngineering.length) add('PASS', 'reverse-engineering gate', 'every shipped manager/specialist declares the reverse-engineering skill');
  else add('FAIL', 'reverse-engineering gate', `missing from: ${missingReverseEngineering.join(', ')}`);

  const uiText = fs.readFileSync(path.join(profilesRoot, 'mansoor-ui-specialist', 'agent.md'), 'utf8');
  const researchText = fs.readFileSync(path.join(profilesRoot, 'research-docs-specialist', 'agent.md'), 'utf8');
  if (/search_web/.test(uiText) && /read_url_content/.test(uiText) && /generate_image/.test(uiText)
      && /search_web/.test(researchText) && /read_url_content/.test(researchText)) {
    add('PASS', 'research and UI capability', 'UI and research specialists expose bounded reference research; UI exposes approved image generation');
  } else add('FAIL', 'research and UI capability', 'required research/image tools are missing from the specialist contracts');

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
