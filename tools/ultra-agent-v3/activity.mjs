#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { projectIdentity } from '../ultra-agent-v2/project-identity.mjs';

const types = new Set(['assignment', 'started', 'milestone', 'blocked', 'handoff', 'completed']);
const transitions = new Map([
  [null, new Set(['assignment'])],
  ['assignment', new Set(['started', 'blocked'])],
  ['started', new Set(['milestone', 'blocked', 'handoff', 'completed'])],
  ['milestone', new Set(['milestone', 'blocked', 'handoff', 'completed'])],
  ['blocked', new Set(['started', 'milestone', 'handoff', 'completed'])],
  ['handoff', new Set(['completed'])],
  ['completed', new Set()],
]);
const secretPattern = /(?:AIza[0-9A-Za-z_-]{30,}|(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._~+/=-]+|(?:password|passwd|pwd|secret|apiKey|api_key|token|authorization)\s*[:=]\s*["']?[^\s"';,}]+)/gi;
const safe = (value, limit = 2000) => String(value || '').replace(secretPattern, '[REDACTED_SECRET]').slice(0, limit);
const sleep = (milliseconds) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function acquireLock(lockPath, timeoutMs = 5000) {
  const started = Date.now();
  let attempt = 0;
  while (Date.now() - started < timeoutMs) {
    try {
      const descriptor = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() })}\n`, 'utf8');
      return descriptor;
    } catch (error) {
      if (!['EEXIST', 'EPERM', 'EACCES'].includes(error.code)) throw error;
      try {
        const metadata = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        const age = Date.now() - Date.parse(metadata.acquiredAt || 0);
        if (age > 30000 && !pidAlive(Number(metadata.pid))) {
          fs.renameSync(lockPath, `${lockPath}.stale-${Date.now()}`);
          continue;
        }
      } catch { /* malformed/contended locks time out rather than being removed */ }
      sleep(Math.min(200, 10 * (2 ** Math.min(attempt, 4))));
      attempt += 1;
    }
  }
  throw new Error(`Could not acquire activity lock within ${timeoutMs}ms`);
}

function readRecords(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function formatParentUpdate(record) {
  const label = `${record.role} (${record.workerId})`;
  if (record.type === 'assignment') return `Assigned ${label}: ${record.scope}. Deliverable: ${record.deliverable}.`;
  if (record.type === 'blocked') return `${label} blocked: ${record.details || 'No blocker detail supplied'}.`;
  if (record.type === 'completed') return `${label} completed: ${record.details || record.deliverable || 'Result ready'}.`;
  if (record.type === 'handoff') return `${label} handoff ready: ${record.details || record.deliverable || 'Evidence attached'}.`;
  return `${label} ${record.type}: ${record.details || record.scope || 'Progress recorded'}.`;
}

function summarizeActivity({ dir = process.cwd(), project = path.basename(dir), taskId } = {}) {
  const projectDir = path.resolve(dir);
  const projectInfo = projectIdentity({ dir: projectDir, project });
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(String(taskId || ''))) throw new Error('taskId is required and must be safe');
  const file = path.join(projectDir, '.agents', 'ultra-v4', 'activity', `${taskId}.jsonl`);
  const records = readRecords(file).filter((record) => record.projectId === projectInfo.projectId && record.taskId === taskId);
  const grouped = new Map();
  for (const record of records) {
    const list = grouped.get(record.workerId) || [];
    list.push(record);
    grouped.set(record.workerId, list);
  }
  const workers = [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([workerId, workerRecords]) => {
    const latest = workerRecords.at(-1);
    const blocked = workerRecords.filter((record) => record.type === 'blocked').at(-1);
    return {
      workerId,
      role: latest.role,
      latestState: latest.type,
      timeline: workerRecords.map((record) => record.type),
      blockers: workerRecords.filter((record) => record.type === 'blocked').map((record) => safe(record.details)),
      changedPaths: [...new Set(workerRecords.flatMap((record) => record.changedPaths || []))].sort(),
      checks: [...new Set(workerRecords.flatMap((record) => record.checks || []))].sort(),
      deliverable: latest.deliverable || workerRecords.find((record) => record.deliverable)?.deliverable || '',
      latestDetails: safe(latest.details),
      latestParentUpdate: formatParentUpdate(latest),
      latestBlocker: blocked ? safe(blocked.details) : null,
    };
  });
  const blockers = workers.filter((worker) => worker.latestState === 'blocked').map((worker) => ({ workerId: worker.workerId, details: worker.latestBlocker || 'No blocker detail supplied' }));
  const completed = workers.filter((worker) => worker.latestState === 'completed').length;
  const parentUpdate = `Task ${taskId}: ${workers.length} workers; ${blockers.length} blocked; ${completed} completed.`;
  return { ok: true, projectId: projectInfo.projectId, taskId, workers, blockers, completed, parentUpdate };
}

function appendActivity(input = {}) {
  const projectDir = path.resolve(input.dir || process.cwd());
  const project = projectIdentity({ dir: projectDir, project: input.project || path.basename(projectDir) });
  const taskId = safe(input.taskId, 96);
  const workerId = safe(input.workerId, 96);
  const role = safe(input.role, 100);
  const type = String(input.type || '').toLowerCase();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(taskId)) throw new Error('taskId is required and must be safe');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(workerId)) throw new Error('workerId is required and must be safe');
  if (!role || !types.has(type)) throw new Error('role and valid activity type are required');
  if (type === 'assignment' && (!input.scope || !input.deliverable)) throw new Error('assignment requires scope and deliverable');
  const directory = path.join(projectDir, '.agents', 'ultra-v4', 'activity');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `${taskId}.jsonl`);
  const lockPath = `${file}.lock`;
  const descriptor = acquireLock(lockPath);
  try {
    const records = readRecords(file);
    const previous = records.filter((record) => record.workerId === workerId).at(-1)?.type || null;
    if (!transitions.get(previous)?.has(type)) throw new Error(`Illegal activity transition for ${workerId}: ${previous || 'none'} -> ${type}`);
    const record = {
      schemaVersion: 1,
      activityId: crypto.randomUUID(),
      recordedAt: new Date().toISOString(),
      projectId: project.projectId,
      taskId,
      workerId,
      role,
      type,
      scope: safe(input.scope),
      deliverable: safe(input.deliverable),
      details: safe(input.details),
      changedPaths: [...new Set((input.changedPaths || []).map((value) => safe(value, 500)).filter(Boolean))].slice(0, 100),
      checks: [...new Set((input.checks || []).map((value) => safe(value, 500)).filter(Boolean))].slice(0, 100),
    };
    fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
    return { ok: true, file, record, parentUpdate: formatParentUpdate(record) };
  } finally {
    fs.closeSync(descriptor);
    try { fs.unlinkSync(lockPath); } catch { /* lock already quarantined by recovery */ }
  }
}

export { appendActivity, formatParentUpdate, summarizeActivity };

if (process.argv[1] && path.basename(process.argv[1]) === 'activity.mjs') {
  const args = process.argv.slice(2);
  const getArg = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
  const command = args[0] || 'append';
  const output = command === 'summary' ? summarizeActivity({ dir: getArg('--dir', process.cwd()), project: getArg('--project'), taskId: getArg('--task') })
    : command === 'append' ? appendActivity({
      dir: getArg('--dir', process.cwd()), project: getArg('--project'), taskId: getArg('--task'), workerId: getArg('--worker'), role: getArg('--role'), type: getArg('--type'),
      scope: getArg('--scope'), deliverable: getArg('--deliverable'), details: getArg('--details'),
      changedPaths: getArg('--changed-paths').split(',').map((value) => value.trim()).filter(Boolean),
      checks: getArg('--checks').split(',').map((value) => value.trim()).filter(Boolean),
    }) : null;
  if (!output) throw new Error('Usage: activity.mjs append|summary [options]');
  console.log(JSON.stringify(output, null, 2));
}
