import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runtimePaths } from '../ultra-agent-v4/daemon/paths.mjs';
import { enqueueRun, getRun, updateRun } from '../ultra-agent-v4/daemon/queue.mjs';
import { appendRuntimeEvent, readRuntimeEvents } from '../ultra-agent-v4/daemon/events.mjs';
import { handleProtocolRequest } from '../ultra-agent-v4/daemon/protocol.mjs';

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mansoor-daemon-test-'));
}

function task(projectDir, overrides = {}) {
  return {
    projectDir,
    projectId: 'PRJ-001',
    taskId: 'TASK-001',
    objective: 'Inspect the inventory flow without editing application code',
    scope: ['lib/**'],
    acceptance: ['report current inventory flow'],
    ...overrides,
  };
}

test('runtime paths are stable and platform-aware', () => {
  const paths = runtimePaths({ platform: 'win32', env: { LOCALAPPDATA: 'C:\\Users\\tester\\AppData\\Local' }, homeDir: 'C:\\Users\\tester' });
  assert.equal(paths.root, path.join('C:\\Users\\tester\\AppData\\Local', 'Mansoor-Agent-Hub', 'runtime'));
  assert.equal(paths.socketName, '\\\\.\\pipe\\mansoor-agent-v1');
});

test('enqueue requires explicit objective, scope and acceptance', () => {
  const root = tempRoot();
  assert.throws(() => enqueueRun({ runsDir: root, input: task(root, { objective: '' }) }), /objective/i);
  assert.throws(() => enqueueRun({ runsDir: root, input: task(root, { scope: [] }) }), /scope/i);
  assert.throws(() => enqueueRun({ runsDir: root, input: task(root, { acceptance: [] }) }), /acceptance/i);
});

test('duplicate idempotency key returns the existing run', () => {
  const root = tempRoot();
  const first = enqueueRun({ runsDir: root, input: task(root) });
  const second = enqueueRun({ runsDir: root, input: task(root) });
  assert.equal(second.runId, first.runId);
  assert.equal(second.idempotentReplay, true);
});

test('events are redacted and can be read after append', () => {
  const root = tempRoot();
  const run = enqueueRun({ runsDir: root, input: task(root) });
  appendRuntimeEvent({ runsDir: root, runId: run.runId, event: { kind: 'progress', status: 'running', message: 'token=super-secret' } });
  const events = readRuntimeEvents({ runsDir: root, runId: run.runId });
  assert.equal(events.length, 2);
  assert.match(events.at(-1).message, /REDACTED_SECRET/);
  assert.doesNotMatch(events.at(-1).message, /super-secret/);
});

test('protocol submit/status/events/stop share the same run record', async () => {
  const root = tempRoot();
  const deps = { runsDir: root, now: () => '2026-11-14T00:00:00.000Z' };
  const submitted = await handleProtocolRequest({ method: 'submit', input: task(root) }, deps);
  assert.equal(submitted.ok, true);
  assert.equal(submitted.run.status, 'queued-host-unavailable');
  const status = await handleProtocolRequest({ method: 'status', runId: submitted.run.runId }, deps);
  assert.equal(status.run.runId, submitted.run.runId);
  const stopped = await handleProtocolRequest({ method: 'stop', runId: submitted.run.runId }, deps);
  assert.equal(stopped.run.status, 'cancelled');
  const events = await handleProtocolRequest({ method: 'events', runId: submitted.run.runId }, deps);
  assert.ok(events.events.some((event) => event.kind === 'cancelled'));
});

test('updateRun preserves run identity and changes only explicit state', () => {
  const root = tempRoot();
  const run = enqueueRun({ runsDir: root, input: task(root) });
  const updated = updateRun({ runsDir: root, runId: run.runId, patch: { status: 'paused', blocker: 'host unavailable' } });
  assert.equal(updated.runId, run.runId);
  assert.equal(updated.status, 'paused');
  assert.equal(getRun({ runsDir: root, runId: run.runId }).blocker, 'host unavailable');
});
