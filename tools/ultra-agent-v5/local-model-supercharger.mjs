#!/usr/bin/env node

import { concurrencyPolicy, isTurboAutonomy, resolveParallelCapacity } from '../ultra-agent-v3/concurrency.mjs';

const DEFAULT_STAGES = Object.freeze([
  'backend-probe', 'context-pack', 'evidence-retrieval', 'task-decomposition',
  'bounded-tool-use', 'implementation-or-answer', 'independent-verification', 'owner-handoff',
]);

const LOCAL_BACKENDS = Object.freeze([
  { id: 'ollama', command: 'ollama', probe: ['list'], promptTransport: 'stdin-or-api' },
  { id: 'llama.cpp', command: 'llama-cli', probe: ['--version'], promptTransport: 'stdin' },
  { id: 'vllm', command: 'vllm', probe: ['--version'], promptTransport: 'api-or-cli' },
]);

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function listLocalBackends() {
  return LOCAL_BACKENDS.map((backend) => ({ ...backend, probe: [...backend.probe] }));
}

export function probeLocalBackend({ backend = 'auto', model = '', commandRunner = null } = {}) {
  const requested = String(backend || 'auto').toLowerCase();
  const candidates = requested === 'auto' ? LOCAL_BACKENDS : LOCAL_BACKENDS.filter((entry) => entry.id === requested);
  if (!candidates.length) return { status: 'unconfigured', backend: requested, model: model || null, reason: 'unsupported-local-backend' };
  if (typeof commandRunner !== 'function') return { status: 'unconfigured', backend: candidates[0].id, model: model || null, reason: 'probe-not-injected' };
  for (const candidate of candidates) {
    const result = commandRunner(candidate.command, candidate.probe);
    if (result?.ok) return { status: 'ready', backend: candidate.id, model: String(result.model || model || 'not-reported'), contextTokens: numberOr(result.contextTokens, 8192), device: result.device || 'not-reported' };
  }
  return { status: 'unavailable', backend: requested, model: model || null, reason: 'no-local-backend-responded' };
}

export function createLocalModelSuperchargePlan({ task = '', backend = null, model = null, contextTokens = 8192, risk = 'low', tools = [], projectEvidence = [], autonomy = '', maxParallel } = {}) {
  const normalizedRisk = ['low', 'medium', 'high'].includes(String(risk)) ? String(risk) : 'medium';
  const stages = [...DEFAULT_STAGES];
  const maxParallelWorkers = isTurboAutonomy(autonomy)
    ? resolveParallelCapacity({ requested: maxParallel, autonomy, parallelRequested: true })
    : Math.max(1, Math.min(Number(maxParallel) || (normalizedRisk === 'high' ? 2 : 3), 20));
  const requiredEvidence = ['task-contract', 'project-scoped-context', 'structured-result', 'focused-verification', 'independent-checkpoint'];
  if (/browser|live site|lighthouse/i.test(String(task))) requiredEvidence.push('browser-rendered-evidence', 'lighthouse-final-gate');
  if (/security|secure|auth|tenant|secret|payment/i.test(String(task))) requiredEvidence.push('negative-path-security-check');
  return {
    schema: 'mansoor.local-model-supercharger/v1',
    backend: { mode: backend || 'local-preferred', model: model || 'host-selected-or-probed', contextTokens: numberOr(contextTokens, 8192) },
    task: String(task), risk: normalizedRisk, stages,
    contextPolicy: { include: ['task contract', 'relevant repository map', 'current evidence', 'approved references', 'failure history'], exclude: ['unrelated files', 'secrets', 'raw hidden reasoning', 'stale unversioned facts'] },
    tools: [...new Set(tools.map(String))].slice(0, 12),
    projectEvidenceCount: Array.isArray(projectEvidence) ? projectEvidence.length : 0,
    maxParallelWorkers,
    concurrency: concurrencyPolicy({ autonomy, capacity: maxParallelWorkers }),
    requiredEvidence,
    fallback: { checkpointBeforeSwitch: true, silentSwitchAllowed: false, allowedModes: ['local', 'host-managed', 'deterministic-tool', 'owner-review'] },
    qualityContract: { structuredOutput: true, independentVerifier: true, boundedRetries: 1, replayable: true, reportUnknowns: true },
    stopCondition: 'Stop after the selected evidence gates and one independent verification pass; return blockers instead of inventing capability.',
  };
}

export function buildLocalContextPacket({ task = '', contract = {}, evidence = [], repositoryMap = null, maxItems = 24 } = {}) {
  const boundedEvidence = (Array.isArray(evidence) ? evidence : []).slice(0, Math.max(1, Number(maxItems) || 24)).map((item) => ({ ...item }));
  return {
    schema: 'mansoor.local-context-packet/v1', task: String(task), contract: { ...contract }, repositoryMap: repositoryMap ? { ...repositoryMap } : null,
    evidence: boundedEvidence, omittedEvidence: Math.max(0, (Array.isArray(evidence) ? evidence.length : 0) - boundedEvidence.length), provenanceRequired: true,
  };
}
