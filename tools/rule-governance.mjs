import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { contentSha256 } from './content-hash.mjs';

const requiredFields = ['id', 'version', 'priority', 'scope', 'owner', 'category', 'agents', 'tasks', 'file', 'contentHash', 'requiredEvidence', 'verification'];
const precedence = { security: 0, project: 1, global: 2 };

async function validateRuleRegistry(registry, { root } = {}) {
  const errors = [];
  const hashMismatches = [];
  if (!registry || registry.schemaVersion !== 1 || !Array.isArray(registry.rules)) errors.push('registry must use schemaVersion 1 and contain a rules array');
  const seen = new Set();
  for (const rule of registry?.rules ?? []) {
    for (const field of requiredFields) if (rule?.[field] === undefined || rule?.[field] === null) errors.push(`${rule?.id ?? '<unknown>'} missing ${field}`);
    if (!rule?.id || seen.has(rule.id)) errors.push(`duplicate or empty rule id: ${rule?.id ?? ''}`);
    if (rule?.id) seen.add(rule.id);
    if (!Number.isInteger(rule?.version) || rule.version < 1) errors.push(`${rule?.id} has invalid version`);
    if (!Number.isInteger(rule?.priority) || rule.priority < 0 || rule.priority > 100) errors.push(`${rule?.id} has invalid priority`);
    if (!Array.isArray(rule?.scope) || rule.scope.some((scope) => !['global', 'project'].includes(scope))) errors.push(`${rule?.id} has invalid scope`);
    if (!/^sha256:[a-f0-9]{64}$/i.test(rule?.contentHash ?? '')) errors.push(`${rule?.id} has invalid contentHash`);
    if (root && rule?.file) {
      const filePath = path.resolve(root, rule.file);
      const relative = path.relative(path.resolve(root), filePath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) errors.push(`${rule.id} file escapes root`);
      else try {
        const bytes = await readFile(filePath);
        const hash = `sha256:${contentSha256(bytes, rule.file)}`;
        if (hash.toLowerCase() !== String(rule.contentHash).toLowerCase()) hashMismatches.push(rule.file);
      } catch { errors.push(`${rule.id} rule file is missing or unreadable`); }
    }
  }
  return { valid: errors.length === 0 && hashMismatches.length === 0, errors, hashMismatches };
}

function createRuleRegistry(rules) {
  return { schemaVersion: 1, precedence: ['security', 'project', 'global'], rules };
}

function resolveRules(registry, { projectType = '', agent = '', taskType = '' } = {}) {
  const isMatch = (values, actual) => !actual || values.includes('*') || values.includes(actual);
  return (registry?.rules ?? []).filter((rule) => {
    const applicableScope = rule.category === 'security' || rule.scope.includes('global') || rule.scope.includes('project');
    const projectMatch = !rule.projectTypes?.length || rule.projectTypes.includes(projectType);
    return applicableScope && projectMatch && isMatch(rule.agents, agent) && isMatch(rule.tasks, taskType);
  }).sort((a, b) => (precedence[a.category] ?? 3) - (precedence[b.category] ?? 3) || b.priority - a.priority || a.id.localeCompare(b.id));
}

function evaluateRuleEvidence(rules, evidence = []) {
  const available = new Set(evidence);
  const missing = [];
  for (const rule of rules ?? []) for (const required of rule.requiredEvidence ?? []) if (!available.has(required)) missing.push({ ruleId: rule.id, evidence: required });
  return { compliant: missing.length === 0, missing };
}

export { createRuleRegistry, evaluateRuleEvidence, resolveRules, validateRuleRegistry };
