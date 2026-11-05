#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const STATES = [
  'INTAKE', 'PREFLIGHT', 'CONTEXT', 'MODE', 'PLAN', 'DELEGATE', 'BUILD',
  'VERIFY', 'EVALUATE', 'COMPLETE', 'PAUSED', 'RECOVERABLE_FAILURE',
];
const TRANSITIONS = new Map([
  ['INTAKE', new Set(['PREFLIGHT', 'PAUSED', 'RECOVERABLE_FAILURE'])],
  ['PREFLIGHT', new Set(['CONTEXT', 'PAUSED', 'RECOVERABLE_FAILURE'])],
  ['CONTEXT', new Set(['MODE', 'PAUSED', 'RECOVERABLE_FAILURE'])],
  ['MODE', new Set(['PLAN', 'PAUSED', 'RECOVERABLE_FAILURE'])],
  ['PLAN', new Set(['DELEGATE', 'PAUSED', 'RECOVERABLE_FAILURE'])],
  ['DELEGATE', new Set(['BUILD', 'PAUSED', 'RECOVERABLE_FAILURE'])],
  ['BUILD', new Set(['VERIFY', 'PAUSED', 'RECOVERABLE_FAILURE'])],
  ['VERIFY', new Set(['EVALUATE', 'PAUSED', 'RECOVERABLE_FAILURE'])],
  ['EVALUATE', new Set(['COMPLETE', 'PAUSED', 'RECOVERABLE_FAILURE'])],
  ['PAUSED', new Set(['PREFLIGHT', 'CONTEXT', 'MODE', 'PLAN', 'DELEGATE', 'BUILD', 'VERIFY', 'EVALUATE', 'RECOVERABLE_FAILURE'])],
  ['RECOVERABLE_FAILURE', new Set(['PREFLIGHT', 'CONTEXT', 'MODE', 'PLAN', 'DELEGATE', 'BUILD', 'VERIFY', 'EVALUATE', 'PAUSED'])],
  ['COMPLETE', new Set()],
]);

const args = process.argv.slice(2);
const action = args[0] || 'show';
const getArg = (name, fallback = '') => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const projectDir = path.resolve(getArg('--dir', process.cwd()));
const taskId = getArg('--task');
const projectName = getArg('--project', path.basename(projectDir));
if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) throw new Error(`Project directory does not exist: ${projectDir}`);
if (!taskId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(taskId)) throw new Error('--task is required and must be a safe identifier');

const slugify = (value) => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'project';
const git = (gitArgs) => {
  const result = spawnSync('git', gitArgs, { cwd: projectDir, encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : '';
};
const sanitizeGitUrl = (raw) => {
  if (!raw) return null;
  try {
    const url = new URL(raw.replace(/^git@([^:]+):/, 'ssh://git@$1/'));
    url.username = url.username === 'git' ? 'git' : '';
    url.password = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(raw).replace(/:\/\/[^@]+@/, '://');
  }
};
const projectId = crypto.createHash('sha256')
  .update(`${(sanitizeGitUrl(git(['config', '--get', 'remote.origin.url'])) || `local:${projectDir}`).toLowerCase()}|${slugify(projectName)}`)
  .digest('hex').slice(0, 8);
const taskDir = path.join(projectDir, '.agents', 'ultra-v3', 'tasks', taskId);
const eventsPath = path.join(taskDir, 'events.jsonl');
const statePath = path.join(taskDir, 'state.json');
const checkpointsDir = path.join(taskDir, 'checkpoints');
const secretPattern = /(?:AIza[0-9A-Za-z_-]{30,}|(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._~+/=-]+|(?:password|passwd|pwd|secret|apiKey|api_key|token|authorization)\s*[:=]\s*["']?[^\s"';,}]+)/gi;
const safeText = (value) => String(value || '').replace(secretPattern, '[REDACTED_SECRET]').slice(0, 1000);

function identity() {
  return {
    project: projectName,
    projectId,
    directory: projectDir,
    branch: git(['branch', '--show-current']) || null,
    commit: git(['rev-parse', '--short', 'HEAD']) || null,
  };
}

function readEvents() {
  if (!fs.existsSync(eventsPath)) return { events: [], corruptTail: false };
  const events = [];
  let corruptTail = false;
  for (const line of fs.readFileSync(eventsPath, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && parsed.taskId === taskId && typeof parsed.nextState === 'string') events.push(parsed);
      else corruptTail = true;
    } catch {
      corruptTail = true;
    }
  }
  return { events, corruptTail };
}

function atomicWrite(file, content) {
  const temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(temp, content, 'utf8');
  fs.renameSync(temp, file);
}

function materialize(events) {
  const latest = events.at(-1);
  if (!latest) return null;
  const snapshot = {
    schemaVersion: 1,
    taskId,
    project: identity(),
    state: latest.nextState,
    updatedAt: latest.recordedAt,
    eventCount: events.length,
    lastEventId: latest.eventId,
    error: latest.error || null,
    evidenceRefs: latest.evidenceRefs || [],
  };
  atomicWrite(statePath, `${JSON.stringify(snapshot, null, 2)}\n`);
  return snapshot;
}

function persistEvents(events) {
  fs.mkdirSync(taskDir, { recursive: true });
  atomicWrite(eventsPath, events.map((event) => JSON.stringify(event)).join('\n') + (events.length ? '\n' : ''));
  return materialize(events);
}

function newEvent(previousState, nextState, extra = {}) {
  return {
    schemaVersion: 1,
    eventId: crypto.randomUUID(),
    recordedAt: new Date().toISOString(),
    taskId,
    projectId,
    previousState: previousState || null,
    nextState,
    error: extra.error ? safeText(extra.error) : null,
    evidenceRefs: Array.isArray(extra.evidenceRefs) ? extra.evidenceRefs.map(safeText).slice(0, 20) : [],
    label: extra.label ? safeText(extra.label) : null,
  };
}

function currentState(events) { return events.at(-1)?.nextState || null; }

function requireState(events) {
  const state = currentState(events);
  if (!state) throw new Error(`Task does not exist: ${taskId}`);
  return state;
}

function start() {
  const existing = readEvents();
  if (existing.events.length) return { ok: true, action, idempotent: true, ...materialize(existing.events) };
  const snapshot = persistEvents([newEvent(null, 'INTAKE')]);
  return { ok: true, action, ...snapshot, projectId };
}

function transition() {
  const loaded = readEvents();
  const previous = requireState(loaded.events);
  const next = getArg('--to');
  if (!STATES.includes(next)) throw new Error(`Unknown state: ${next || '(missing)'}`);
  if (!TRANSITIONS.get(previous)?.has(next)) throw new Error(`Illegal state transition: ${previous} -> ${next}`);
  const snapshot = persistEvents([...loaded.events, newEvent(previous, next, {
    error: getArg('--error'),
    evidenceRefs: getArg('--evidence').split(',').map((value) => value.trim()).filter(Boolean),
  })]);
  return { ok: true, action, ...snapshot };
}

function checkpoint() {
  const loaded = readEvents();
  const snapshot = materialize(loaded.events);
  if (!snapshot) throw new Error(`Task does not exist: ${taskId}`);
  fs.mkdirSync(checkpointsDir, { recursive: true });
  const label = slugify(getArg('--label', 'checkpoint'));
  const checkpointPath = path.join(checkpointsDir, `${Date.now()}-${label}.json`);
  atomicWrite(checkpointPath, `${JSON.stringify({ ...snapshot, checkpointLabel: label }, null, 2)}\n`);
  return { ok: true, action, ...snapshot, checkpointPath };
}

function resume() {
  const loaded = readEvents();
  if (!loaded.events.length) throw new Error(`Task does not exist: ${taskId}`);
  const snapshot = persistEvents(loaded.events);
  return { ok: true, action, ...snapshot, recoveredCorruptTail: loaded.corruptTail };
}

function show() {
  const loaded = readEvents();
  const snapshot = materialize(loaded.events);
  if (!snapshot) throw new Error(`Task does not exist: ${taskId}`);
  return { ok: true, action, ...snapshot, recoveredCorruptTail: loaded.corruptTail };
}

try {
  const result = action === 'start' ? start()
    : action === 'transition' ? transition()
      : action === 'checkpoint' ? checkpoint()
        : action === 'resume' ? resume()
          : action === 'show' ? show()
            : (() => { throw new Error('Usage: node state.mjs start|transition|checkpoint|resume|show --dir PATH --task ID --project NAME'); })();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`Ultra Agent v3 state: ${error.message}`);
  process.exitCode = 1;
}
