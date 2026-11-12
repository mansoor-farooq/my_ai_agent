#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const secretPattern = /(?:AIza[0-9A-Za-z_-]{20,}|(?:sk|ghp|github_pat)[_-][A-Za-z0-9_-]{16,}|-----BEGIN [^-]+ PRIVATE KEY-----)/i;

export function validateBenchmarkCase(value = {}) {
  const missing = [];
  for (const field of ['id', 'domain', 'objective']) if (!String(value[field] || '').trim()) missing.push(field);
  if (!Array.isArray(value.acceptance) || !value.acceptance.length) missing.push('acceptance');
  if (value.reviewStatus !== 'approved') missing.push('owner-review');
  if (!String(value.approvedBy || '').trim()) missing.push('approvedBy');
  if (!Number.isFinite(Date.parse(value.approvedAt || ''))) missing.push('approvedAt');
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/i.test(String(value.baseRevision || ''))) missing.push('baseRevision');
  if (!/^sha256:[a-f0-9]{64}$/i.test(String(value.configHash || ''))) missing.push('configHash');
  if (typeof value.expected?.accepted !== 'boolean') missing.push('expected.accepted');
  return { eligible: missing.length === 0, missing };
}

export async function loadBenchmarkCase(file) {
  const absolute = path.resolve(file);
  const parsed = JSON.parse(await fs.readFile(absolute, 'utf8'));
  for (const field of ['id', 'domain', 'objective']) if (!String(parsed?.[field] || '').trim()) throw new Error(`benchmark case requires ${field}`);
  if (!Array.isArray(parsed.acceptance) || !parsed.acceptance.length) throw new Error('benchmark case requires acceptance criteria');
  if (secretPattern.test(JSON.stringify(parsed))) throw new Error('benchmark case contains a credential-like value');
  const eligibility = validateBenchmarkCase(parsed);
  return { schema: 'mansoor.agent-benchmark-case/v1', ...parsed, id: String(parsed.id), domain: String(parsed.domain), objective: String(parsed.objective), acceptance: parsed.acceptance.map(String), prompt: parsed.prompt ? String(parsed.prompt) : null, baseline: parsed.baseline || null, eligible: eligibility.eligible, ineligibilityReasons: eligibility.missing, source: absolute };
}

export function evaluateBenchmarkCase({ id, expected = {}, observed = {} } = {}) {
  const accepted = observed.accepted === true && (expected.accepted === undefined || observed.accepted === expected.accepted) && observed.regression !== true && (expected.regression !== false || observed.regression === false);
  const failureReason = accepted ? null : observed.unsafeAction === true ? 'unsafe-action' : observed.regression === true ? 'regression' : observed.accepted !== true ? (observed.failureReason || 'not-accepted') : 'expectation-mismatch';
  return { id: String(id || ''), accepted, regression: observed.regression === true, unsafeAction: observed.unsafeAction === true, latencyMs: Number.isFinite(Number(observed.latencyMs)) ? Number(observed.latencyMs) : null, failureReason, observedAt: new Date().toISOString() };
}

