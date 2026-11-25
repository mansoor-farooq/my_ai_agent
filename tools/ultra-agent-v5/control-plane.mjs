#!/usr/bin/env node
import { redact } from '../ultra-agent-v4/daemon/events.mjs';

const PHASE_PROGRESS = Object.freeze({ queued: 5, planning: 20, executing: 45, blocked: 60, verifying: 75, handoff: 90, completed: 100, stopped: 100 });

function phaseForStatus(status) {
  const value = String(status || '').toLowerCase();
  if (/queued|host-unavailable/.test(value)) return 'queued';
  if (/plan|intake|research/.test(value)) return 'planning';
  if (/blocked|recoverable|failed/.test(value)) return 'blocked';
  if (/verify|review/.test(value)) return 'verifying';
  if (/handoff|promot/.test(value)) return 'handoff';
  if (/complete|success/.test(value)) return 'completed';
  if (/cancel|stop|escalat/.test(value)) return 'stopped';
  return 'executing';
}

function unique(values) { return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]; }

function normalizeWorker(worker = {}) {
  return {
    workerId: redact(worker.workerId || worker.id || 'unknown', 120),
    role: redact(worker.role || 'worker', 120),
    latestState: redact(worker.latestState || worker.state || 'unknown', 80),
    blockers: unique((worker.blockers || []).map((value) => redact(value, 500))),
    changedPaths: unique((worker.changedPaths || []).map((value) => redact(value, 500))),
    checks: unique((worker.checks || []).map((value) => redact(value, 500))),
    timeline: unique((worker.timeline || []).map((value) => redact(value, 80))),
  };
}

function safeDetails(value) {
  if (!value || typeof value !== 'object') return undefined;
  try { return JSON.parse(redact(JSON.stringify(value), 2000)); } catch { return { value: redact(value, 500) }; }
}

export function collectVerifiedArtifacts(artifacts = []) {
  return (Array.isArray(artifacts) ? artifacts : []).map((artifact) => {
    const relativePath = String(artifact?.path || artifact?.relativePath || '');
    const hash = String(artifact?.sha256 || artifact?.hash || '');
    if (!relativePath || relativePath.startsWith('/') || relativePath.startsWith('\\') || /^[A-Za-z]:/.test(relativePath) || relativePath.split(/[\\/]/).includes('..')) return null;
    if (!/^sha256:[a-f0-9]{64}$/i.test(hash)) return null;
    return { path: redact(relativePath, 500), sha256: hash.toLowerCase(), kind: redact(artifact.kind || 'artifact', 100), checks: unique((artifact.checks || []).map((value) => redact(value, 300))) };
  }).filter(Boolean).sort((left, right) => left.path.localeCompare(right.path));
}

export function buildControlPlaneSnapshot({ run = {}, events = [], activitySummary = null, artifacts = [], model = null } = {}) {
  const eventList = Array.isArray(events) ? events : [];
  const latestEvent = eventList.at(-1) || {};
  const status = String(latestEvent.status || run.status || 'unknown');
  const phase = phaseForStatus(status);
  const activityWorkers = Array.isArray(activitySummary?.workers) ? activitySummary.workers.map(normalizeWorker) : [];
  const eventWorkers = eventList.map((event) => event.details).filter((details) => details?.workerId).map(normalizeWorker);
  const workers = [...new Map([...eventWorkers, ...activityWorkers].map((worker) => [worker.workerId, worker])).values()].sort((left, right) => left.workerId.localeCompare(right.workerId));
  const blockerValues = [
    ...(Array.isArray(run.blockers) ? run.blockers : []),
    ...(Array.isArray(activitySummary?.blockers) ? activitySummary.blockers.map((blocker) => blocker.details || blocker.reason) : []),
    ...eventList.filter((event) => /blocked|failed|recoverable/i.test(`${event.kind} ${event.status}`)).map((event) => event.message || event.details?.reason),
  ];
  const blockers = unique(blockerValues.map((value) => redact(value, 1000))).map((details) => ({ details }));
  const evidence = unique([
    ...(Array.isArray(run.evidenceIds) ? run.evidenceIds : []),
    ...eventList.flatMap((event) => Array.isArray(event.evidenceIds) ? event.evidenceIds : []),
  ].map((value) => redact(value, 200)));
  const verifiedArtifacts = collectVerifiedArtifacts(artifacts.length ? artifacts : run.artifacts);
  const nextActions = phase === 'blocked' ? ['inspect-blocker', 'repair-or-owner-review', 'resume-after-repair']
    : phase === 'queued' ? ['wait-for-host-session', 'follow-events']
      : phase === 'completed' ? ['review-handoff', 'promote-or-close']
        : phase === 'stopped' ? ['owner-review', 'resume-if-authorized']
          : ['follow-events', 'await-verification'];
  const snapshot = {
    schema: 'mansoor.antigravity-control-plane/v1',
    runId: redact(run.runId, 120), projectId: redact(run.projectId, 120), taskId: redact(run.taskId, 120),
    status: redact(status, 80), phase, progress: PHASE_PROGRESS[phase] ?? 0,
    objective: redact(run.objective, 1200), updatedAt: redact(run.updatedAt, 80),
    workers, blockers, evidence, artifacts: verifiedArtifacts,
    model: { backend: redact(model?.backend || run.backend || 'host-managed', 120), identity: redact(model?.identity || run.modelIdentity || 'not-exposed-by-host', 200), switching: 'visible-and-checkpoint-bound' },
    approvals: { autonomyProfile: redact(run.autonomyProfile || 'managed', 100), retryCount: Number(run.retryCount || 0), ownerReviewRequired: phase === 'blocked' || phase === 'stopped' },
    recentEvents: eventList.slice(-20).map((event) => ({ kind: redact(event.kind, 80), status: redact(event.status, 80), message: redact(event.message, 1000), evidenceIds: Array.isArray(event.evidenceIds) ? event.evidenceIds.map((value) => redact(value, 200)) : [], details: safeDetails(event.details) })),
    nextActions, eventCount: eventList.length,
  };
  const contextTelemetry = run.contextTelemetry || run.contextIntelligence?.context_telemetry || latestEvent.details?.contextTelemetry;
  const handoff = run.handoff || run.contextIntelligence?.handoff || latestEvent.details?.handoff;
  if (contextTelemetry) snapshot.contextTelemetry = safeDetails(contextTelemetry);
  if (handoff) snapshot.handoff = safeDetails(handoff);
  return snapshot;
}
