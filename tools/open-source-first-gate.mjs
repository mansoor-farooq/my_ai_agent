#!/usr/bin/env node
import path from 'node:path';

const PERMISSIVE_LICENSES = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'Unlicense']);
const REVIEW_LICENSES = new Set(['MPL-2.0', 'LGPL-2.1', 'LGPL-3.0', 'EPL-2.0', 'GPL-2.0', 'GPL-3.0', 'AGPL-3.0']);

function text(value) { return String(value || '').trim(); }
function list(value) { return [...new Set((Array.isArray(value) ? value : []).map(text).filter(Boolean))]; }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function tokens(value) { return [...new Set(text(value).toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2))]; }
function licenseState(candidate) {
  if (candidate.licenseCompatible === true) return 'compatible';
  const license = text(candidate.license);
  if (PERMISSIVE_LICENSES.has(license)) return 'compatible';
  if (REVIEW_LICENSES.has(license)) return 'review-required';
  return 'unknown';
}
function maintenanceState(candidate) {
  const explicit = text(candidate.maintenanceStatus).toLowerCase();
  if (['active', 'maintained', 'recent'].includes(explicit)) return 'active';
  if (['stale', 'archived', 'unmaintained'].includes(explicit)) return 'stale';
  const date = Date.parse(text(candidate.lastActivity));
  if (!Number.isNaN(date)) return (Date.now() - date) <= 1000 * 60 * 60 * 24 * 365 * 2 ? 'active' : 'stale';
  return 'unknown';
}
function relevanceScore(request, candidate) {
  const requested = tokens(request);
  const haystack = tokens([candidate.name, candidate.description, ...(candidate.capabilities || [])].join(' '));
  if (!requested.length || !haystack.length) return 0;
  return requested.filter((token) => haystack.includes(token)).length / requested.length;
}
function evidenceScore(candidate) {
  const checks = [candidate.url, candidate.license, candidate.defaultBranch || candidate.commit, candidate.sourceRefs?.length, candidate.capabilities?.length, candidate.reverseEngineeringMap];
  return checks.filter(Boolean).length / checks.length;
}
function popularityScore(candidate) {
  return Math.min(1, Math.log10(Math.max(1, number(candidate.stars)) + 1) / 6);
}

function normalizeCandidate(candidate, request) {
  const license = licenseState(candidate);
  const maintenance = maintenanceState(candidate);
  const relevance = relevanceScore(request, candidate);
  const evidence = evidenceScore(candidate);
  const popularity = popularityScore(candidate);
  const score = Number((0.45 * relevance + 0.2 * (maintenance === 'active' ? 1 : maintenance === 'unknown' ? 0.4 : 0) + 0.15 * popularity + 0.2 * evidence).toFixed(6));
  const gaps = [];
  if (!text(candidate.url)) gaps.push('repository-url-missing');
  if (license === 'unknown') gaps.push('license-unknown');
  if (license === 'review-required') gaps.push('license-review-required');
  if (maintenance !== 'active') gaps.push(`maintenance-${maintenance}`);
  if (!list(candidate.sourceRefs).length) gaps.push('source-references-missing');
  return {
    name: text(candidate.name), url: text(candidate.url), license: text(candidate.license) || null,
    licenseState: license, maintenanceState: maintenance, stars: number(candidate.stars), forks: number(candidate.forks),
    defaultBranch: text(candidate.defaultBranch) || null, commit: text(candidate.commit) || null,
    capabilities: list(candidate.capabilities), sourceRefs: list(candidate.sourceRefs),
    relevanceScore: Number(relevance.toFixed(6)), evidenceScore: Number(evidence.toFixed(6)), popularityScore: Number(popularity.toFixed(6)),
    score, adaptationRequired: candidate.adaptationRequired === true, securityNotes: list(candidate.securityNotes), gaps,
    reverseEngineeringMap: candidate.reverseEngineeringMap || {},
  };
}

export function rankOpenSourceCandidates({ request = '', candidates = [], scratchFirst = false } = {}) {
  const normalized = (Array.isArray(candidates) ? candidates : []).map((candidate) => normalizeCandidate(candidate, request))
    .sort((left, right) => right.score - left.score || right.relevanceScore - left.relevanceScore || left.name.localeCompare(right.name));
  const eligible = normalized.filter((candidate) => candidate.licenseState === 'compatible' && candidate.maintenanceState === 'active' && candidate.relevanceScore >= 0.25 && candidate.sourceRefs.length > 0);
  let decision = 'custom';
  let selected = null;
  const gaps = [];
  if (scratchFirst) gaps.push('owner-requested-scratch-first');
  else if (!normalized.length) gaps.push('no-open-source-candidates-found');
  else if (!eligible.length) gaps.push('no-candidate-passed-license-maintenance-relevance-evidence-gate');
  else {
    selected = eligible[0];
    decision = selected.adaptationRequired ? 'adapt' : 'reuse';
  }
  if (selected === null && normalized.length) {
    const inspiration = normalized.find((candidate) => candidate.relevanceScore >= 0.25 && candidate.sourceRefs.length > 0);
    if (inspiration && !scratchFirst) { selected = inspiration; decision = 'inspire'; }
  }
  const reverseEngineeringMap = selected ? {
    modules: list(selected.reverseEngineeringMap.modules),
    dataModels: list(selected.reverseEngineeringMap.dataModels),
    workflows: list(selected.reverseEngineeringMap.workflows),
    apis: list(selected.reverseEngineeringMap.apis),
    tests: list(selected.reverseEngineeringMap.tests),
    integrationBoundaries: list(selected.reverseEngineeringMap.integrationBoundaries),
  } : {};
  return {
    schema: 'mansoor.open-source-gate/v1',
    request: text(request),
    decision,
    candidates: normalized,
    selected,
    reverseEngineeringMap,
    licenseAndProvenance: selected ? { license: selected.license, licenseState: selected.licenseState, sourceRefs: selected.sourceRefs, obligations: selected.licenseState === 'compatible' ? ['preserve-license-notice', 'record-upstream-url-and-commit', 'document-local-changes'] : ['pattern-level-inspiration-only-until-license-review'] } : { obligations: [] },
    gaps: [...new Set([...gaps, ...(selected?.gaps || [])])],
    stopCondition: decision === 'custom' ? 'Stop bounded OSS discovery and proceed only with owner-approved custom design.' : 'Stop discovery after the selected source map, license obligations and adaptation boundary are recorded.',
    evidenceRequired: ['candidate-url', 'license', 'maintenance-or-last-activity', 'source-references', 'reverse-engineering-map', 'decision-rationale'],
  };
}

export { PERMISSIVE_LICENSES, REVIEW_LICENSES };

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const args = process.argv.slice(2);
  const value = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
  const raw = value('--candidates-json', '[]');
  let candidates;
  try { candidates = JSON.parse(raw); } catch { throw new Error('--candidates-json must be a JSON array'); }
  if (!Array.isArray(candidates)) throw new Error('--candidates-json must be a JSON array');
  console.log(JSON.stringify(rankOpenSourceCandidates({ request: value('--request'), candidates, scratchFirst: args.includes('--scratch-first') }), null, 2));
}
