import { appendRuntimeEvent, readRuntimeEvents } from './events.mjs';
import { enqueueRun, getRun, updateRun } from './queue.mjs';
import { readDaemonHealth } from '../../ultra-agent-v5/host-resilience.mjs';

export async function handleProtocolRequest(request, deps) {
  const method = String(request?.method || '');
  const now = deps.now || (() => new Date().toISOString());
  const verifyIdentity = (run, { required = false } = {}) => {
    if (!run) return { ok: false, error: 'run-not-found' };
    if (required && (!request.projectId || !request.taskId)) return { ok: false, error: 'run-identity-required', run };
    if (request.projectId && String(request.projectId) !== String(run.projectId)) return { ok: false, error: 'project-identity-mismatch', run };
    if (request.taskId && String(request.taskId) !== String(run.taskId)) return { ok: false, error: 'task-identity-mismatch', run };
    return { ok: true };
  };
  if (method === 'ping') return { ok: true, status: 'ready' };
  if (method === 'health') return { ok: true, health: readDaemonHealth({ paths: { lockFile: deps.lockFile }, now }) };
  if (method === 'submit') return { ok: true, run: enqueueRun({ runsDir: deps.runsDir, input: request.input, now: now() }) };
  if (method === 'status') {
    const run = getRun({ runsDir: deps.runsDir, runId: request.runId });
    if (!run) return { ok: false, error: 'run-not-found' };
    const identity = verifyIdentity(run);
    return identity.ok ? { ok: true, run } : identity;
  }
  if (method === 'events') return { ok: true, events: readRuntimeEvents({ runsDir: deps.runsDir, runId: request.runId, after: request.after, limit: request.limit }) };
  if (method === 'stop') {
    const run = getRun({ runsDir: deps.runsDir, runId: request.runId });
    if (!run) return { ok: false, error: 'run-not-found' };
    const next = updateRun({ runsDir: deps.runsDir, runId: run.runId, patch: { status: 'cancelled', cancelledAt: now(), blockers: [...(run.blockers || []), 'stopped-by-owner'] }, now: now() });
    appendRuntimeEvent({ runsDir: deps.runsDir, runId: run.runId, now: now(), event: { kind: 'cancelled', status: next.status, message: 'Run stopped by owner.' } });
    return { ok: true, run: next };
  }
  if (method === 'resume') {
    const run = getRun({ runsDir: deps.runsDir, runId: request.runId });
    const identity = verifyIdentity(run, { required: true });
    if (!identity.ok) return identity;
    if (!['paused', 'recoverable-failure', 'queued-host-unavailable'].includes(run.status)) return { ok: false, error: 'run-not-resumable', run };
    const next = updateRun({ runsDir: deps.runsDir, runId: run.runId, patch: { status: 'queued-host-unavailable', blockers: [] }, now: now() });
    appendRuntimeEvent({ runsDir: deps.runsDir, runId: run.runId, now: now(), event: { kind: 'resumed', status: next.status, message: 'Run resumed and waiting for host session.' } });
    return { ok: true, run: next };
  }
  if (method === 'retry') {
    const run = getRun({ runsDir: deps.runsDir, runId: request.runId });
    const identity = verifyIdentity(run, { required: true });
    if (!identity.ok) return identity;
    if (Number(run.retryCount || 0) >= 1) return { ok: false, error: 'retry-budget-exhausted', run };
    if (!['paused', 'recoverable-failure', 'blocked'].includes(run.status)) return { ok: false, error: 'run-not-retryable', run };
    const failureCode = String(run.failureCode || request.failureCode || '').toLowerCase();
    if (/destructive|permission|secret|quota|security|scope|push|deploy/.test(failureCode)) return { ok: false, error: 'retry-not-allowed', reason: 'high-risk-failure', run };
    if (!request.stage || !request.failureSignature) return { ok: false, error: 'retry-identity-required', run };
    if (!run.failureSignature || String(request.failureSignature) !== String(run.failureSignature)) return { ok: false, error: 'failure-signature-mismatch', run };
    const next = updateRun({ runsDir: deps.runsDir, runId: run.runId, patch: { status: 'queued-host-unavailable', retryCount: Number(run.retryCount || 0) + 1, retryStage: String(request.stage), blockers: [] }, now: now() });
    appendRuntimeEvent({ runsDir: deps.runsDir, runId: run.runId, now: now(), event: { kind: 'retry-scheduled', status: next.status, message: `Bounded retry scheduled for ${String(request.stage)}.` } });
    return { ok: true, run: next };
  }
  if (method === 'doctor') return { ok: true, daemon: 'ready', runsDir: deps.runsDir };
  return { ok: false, error: 'unknown-method' };
}
