import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { appendRuntimeEvent } from './events.mjs';
import { withProcessLockSync } from '../../ultra-agent-v5/process-lock.mjs';

function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function atomicWrite(file, value) {
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, file);
}
function safe(value, label) {
  const result = String(value || '');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(result)) throw new Error(`${label} must be a safe identifier`);
  return result;
}
function normalizeList(value, label) {
  if (!Array.isArray(value) || !value.length || value.some((item) => !String(item || '').trim())) throw new Error(`${label} is required`);
  return [...new Set(value.map((item) => String(item).trim()))];
}
function runFiles(runsDir, runId) {
  const dir = path.join(runsDir, runId);
  return { dir, file: path.join(dir, 'run.json') };
}
function readRunFile(file) { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null; }
function allRuns(runsDir) {
  if (!fs.existsSync(runsDir)) return [];
  return fs.readdirSync(runsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => readRunFile(path.join(runsDir, entry.name, 'run.json'))).filter(Boolean);
}

export function createRunId() { return `RUN-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`; }

export function enqueueRun({ runsDir, input, now = new Date().toISOString() }) {
  if (!input || typeof input !== 'object') throw new Error('task input is required');
  const objective = String(input.objective || '').trim();
  if (!objective) throw new Error('objective is required');
  const scope = normalizeList(input.scope, 'scope');
  const acceptance = normalizeList(input.acceptance, 'acceptance');
  const projectDir = path.resolve(String(input.projectDir || ''));
  if (!projectDir || !fs.existsSync(projectDir)) throw new Error('project directory is required');
  const projectId = safe(input.projectId, 'projectId');
  const taskId = safe(input.taskId, 'taskId');
  fs.mkdirSync(runsDir, { recursive: true });
  return withProcessLockSync(path.join(runsDir, '.queue.lock'), () => {
    const idempotencyKey = `sha256:${hash(JSON.stringify({ projectDir, projectId, objective, scope, acceptance, contractVersion: String(input.contractVersion || '1') }))}`;
    const existing = allRuns(runsDir).find((run) => run.idempotencyKey === idempotencyKey);
    if (existing) return { ...existing, idempotentReplay: true };
    const runId = createRunId();
    const run = {
      schema: 'mansoor.runtime-run/v1', runId, projectId, taskId, projectDir, objective,
      scope, acceptance, forbiddenPaths: Array.isArray(input.forbiddenPaths) ? input.forbiddenPaths.map(String) : [],
      mode: input.mode === 'premium' ? 'premium' : 'fast',
      agent: String(input.agent || 'Mansoor AI Team Manager'),
      contractVersion: String(input.contractVersion || '1'),
      idempotencyKey, status: 'queued-host-unavailable', createdAt: now, updatedAt: now,
      attempts: 0, blockers: [], evidenceIds: [],
    };
    const { dir, file } = runFiles(runsDir, runId);
    fs.mkdirSync(dir, { recursive: true });
    atomicWrite(file, run);
    appendRuntimeEvent({ runsDir, runId, now, event: { kind: 'queued', status: run.status, agent: run.agent, message: 'Task queued; waiting for Antigravity host session.' } });
    return run;
  });
}

export function getRun({ runsDir, runId }) {
  safe(runId, 'runId');
  return readRunFile(runFiles(runsDir, runId).file);
}

export function updateRun({ runsDir, runId, patch, now = new Date().toISOString() }) {
  return withProcessLockSync(path.join(runsDir, '.queue.lock'), () => {
    const current = getRun({ runsDir, runId });
    if (!current) throw new Error('run not found');
    const next = { ...current, ...patch, runId: current.runId, updatedAt: now };
    atomicWrite(runFiles(runsDir, runId).file, next);
    return next;
  });
}
