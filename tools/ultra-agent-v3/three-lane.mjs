#!/usr/bin/env node
import path from 'node:path';

function unique(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function routeDomains(routingPlan) {
  return unique(routingPlan?.matchedDomains || []);
}

function chooseQualityRole(specialists = []) {
  return specialists.find((role) => /qa|quality|performance|security|audit/i.test(role))
    || 'qa-release-specialist';
}

function chooseBuilderRole(specialists = []) {
  return specialists.find((role) => !/qa|quality|audit|manager|orchestrator/i.test(role))
    || specialists[0]
    || 'primary-domain-specialist';
}

function buildChunks({ workItems = [], changedPaths = [], domains = [] } = {}) {
  const normalized = workItems.map((item, index) => ({
    id: String(item?.id || `implementation-chunk-${index + 1}`),
    scope: String(item?.scope || ''),
    deliverable: String(item?.deliverable || ''),
    ownedPaths: unique(item?.ownedPaths || []),
    readOnly: Boolean(item?.readOnly),
    dependsOn: unique(item?.dependsOn || []),
  }));
  if (normalized.length) {
    const chunks = normalized.map((item) => ({
    ...item,
    ownerLane: item.readOnly ? 'quality-lane' : 'fast-lane',
    handoff: item.readOnly ? 'quality-lane.findings' : 'fast-lane.patch-summary',
    }));
    if (!chunks.some((chunk) => chunk.ownerLane === 'fast-lane')) chunks.unshift({
      id: 'implementation-core',
      scope: domains.length ? `domain:${domains.join(',')}` : 'requested scope',
      deliverable: 'Apply approved implementation changes after the quality findings are available.',
      ownedPaths: unique(changedPaths),
      readOnly: false,
      dependsOn: [],
      ownerLane: 'fast-lane',
      handoff: 'fast-lane.patch-summary',
    });
    return chunks;
  }
  return [{
    id: 'implementation-core',
    scope: domains.length ? `domain:${domains.join(',')}` : 'requested scope',
    deliverable: 'scoped implementation or primary investigation',
    ownedPaths: unique(changedPaths),
    readOnly: false,
    dependsOn: [],
    ownerLane: 'fast-lane',
    handoff: 'fast-lane.patch-summary',
  }];
}

/**
 * Build the premium three-lane topology without creating a second manager.
 * The manager lane is a convergence phase owned by the main manager; it is
 * represented explicitly so hosts can enforce the barrier and evidence rules.
 */
function buildThreeLanePlan({
  enabled = false,
  request = '',
  specialists = [],
  workItems = [],
  routingPlan = null,
  changedPaths = [],
  risk = 'medium',
} = {}) {
  const domains = routeDomains(routingPlan);
  const builderRole = chooseBuilderRole(specialists);
  const qualityRole = chooseQualityRole(specialists.filter((role) => role !== builderRole));
  const chunks = buildChunks({ workItems, changedPaths, domains });
  const laneMode = enabled ? 'three-lane' : 'single-owner';
  const sharedContext = {
    schema: 'mansoor.shared-context-digest/v1',
    source: 'manager-intake',
    request: String(request || ''),
    risk: String(risk || 'medium'),
    changedPaths: unique(changedPaths),
    domains,
    readOnce: ['project identity', 'toolchain and lockfiles', 'relevant memory', 'acceptance criteria'],
    passDeltasOnly: true,
  };
  const lanes = enabled ? [
    {
      id: 'fast-lane',
      kind: 'builder',
      role: builderRole,
      readOnly: false,
      owns: 'implementation-or-primary-investigation',
      startsWhen: 'shared-context-ready',
      emits: ['patch-summary', 'changed-paths', 'checks', 'gaps'],
    },
    {
      id: 'quality-lane',
      kind: 'research-critic',
      role: qualityRole,
      readOnly: true,
      owns: 'independent-research-and-risk-review',
      startsWhen: 'shared-context-ready',
      emits: ['findings', 'evidence', 'acceptance-gaps', 'recommended-repairs'],
    },
    {
      id: 'manager-lane',
      kind: 'convergence-verifier',
      role: 'production-orchestrator',
      readOnly: true,
      owns: 'join-synthesis-and-final-verification',
      startsWhen: 'fast-lane-and-quality-lane-complete',
      dependsOn: ['fast-lane', 'quality-lane'],
      emits: ['merged-result', 'verification', 'promotion-decision'],
    },
  ] : [{
    id: 'single-owner',
    kind: 'builder-and-verifier',
    role: builderRole,
    readOnly: false,
    owns: 'scoped-task',
    startsWhen: 'shared-context-ready',
    emits: ['result', 'checks', 'gaps'],
  }];
  return {
    schema: 'mansoor.execution-topology/v1',
    mode: laneMode,
    maxConcurrent: enabled ? 2 : 1,
    barrier: enabled ? 'fast-lane + quality-lane -> manager-lane' : 'single-owner',
    duplicateReadPolicy: 'shared-context-digest-once-then-deltas',
    managerIsDispatcher: true,
    managerLaneIsPhase: true,
    sharedContext,
    lanes,
    chunks,
    handoffs: enabled ? [
      { from: 'fast-lane', to: 'manager-lane', artifact: 'patch-summary', required: true },
      { from: 'quality-lane', to: 'manager-lane', artifact: 'findings-and-evidence', required: true },
      { from: 'manager-lane', to: 'owner', artifact: 'merged-result-and-promotion-decision', required: true },
    ] : [{ from: 'single-owner', to: 'owner', artifact: 'result-and-checks', required: true }],
  };
}

export { buildThreeLanePlan };

if (process.argv[1] && path.basename(process.argv[1]) === 'three-lane.mjs') {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input-json');
  const rawInput = inputIndex >= 0 ? args[inputIndex + 1] : null;
  if (!rawInput) throw new Error('Usage: node three-lane.mjs --input-json <JSON object>');
  const input = JSON.parse(rawInput);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('--input-json must be a JSON object');
  console.log(JSON.stringify(buildThreeLanePlan(input), null, 2));
}
