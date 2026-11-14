import { appendRuntimeEvent, readRuntimeEvents } from './events.mjs';
import { enqueueRun, getRun, updateRun } from './queue.mjs';

export async function handleProtocolRequest(request, deps) {
  const method = String(request?.method || '');
  const now = deps.now || (() => new Date().toISOString());
  if (method === 'ping') return { ok: true, status: 'ready' };
  if (method === 'submit') return { ok: true, run: enqueueRun({ runsDir: deps.runsDir, input: request.input, now: now() }) };
  if (method === 'status') {
    const run = getRun({ runsDir: deps.runsDir, runId: request.runId });
    return run ? { ok: true, run } : { ok: false, error: 'run-not-found' };
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
    if (!run) return { ok: false, error: 'run-not-found' };
    if (!['paused', 'recoverable-failure', 'queued-host-unavailable'].includes(run.status)) return { ok: false, error: 'run-not-resumable', run };
    const next = updateRun({ runsDir: deps.runsDir, runId: run.runId, patch: { status: 'queued-host-unavailable', blocker: null }, now: now() });
    appendRuntimeEvent({ runsDir: deps.runsDir, runId: run.runId, now: now(), event: { kind: 'resumed', status: next.status, message: 'Run resumed and waiting for host session.' } });
    return { ok: true, run: next };
  }
  if (method === 'doctor') return { ok: true, daemon: 'ready', runsDir: deps.runsDir };
  return { ok: false, error: 'unknown-method' };
}
