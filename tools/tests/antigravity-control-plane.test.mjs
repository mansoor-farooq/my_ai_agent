import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildControlPlaneSnapshot, collectVerifiedArtifacts } from '../ultra-agent-v5/control-plane.mjs';
import { handleProtocolRequest } from '../ultra-agent-v4/daemon/protocol.mjs';
import { enqueueRun, getRun, updateRun } from '../ultra-agent-v4/daemon/queue.mjs';
import { createManagedMcpServer } from '../ultra-agent-v4/mcp-server.mjs';

function runFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'control-plane-'));
  return { root, runsDir: path.join(root, 'runs'), projectDir: path.join(root, 'project') };
}

test('builds a deterministic control-plane snapshot with phase, progress, workers and redaction', () => {
  const snapshot = buildControlPlaneSnapshot({
    run: {
      runId: 'RUN-1', projectId: 'project-1', taskId: 'task-1', status: 'running', updatedAt: '2026-11-24T00:00:00.000Z',
      modelIdentity: 'ollama:qwen-local', backend: 'local', objective: 'Fix API', blockers: [],
    },
    events: [
      { kind: 'started', status: 'running', message: 'started' },
      { kind: 'milestone', status: 'running', message: 'worker update', details: { workerId: 'worker-a', role: 'coder', state: 'running', secret: 'token=hidden' } },
      { kind: 'blocked', status: 'recoverable-failure', message: 'blocked', details: { reason: 'test failed' } },
    ],
    activitySummary: { workers: [{ workerId: 'worker-a', role: 'coder', latestState: 'blocked', blockers: ['test failed'], changedPaths: ['src/api.js'], checks: ['npm test'] }], blockers: [{ workerId: 'worker-a', details: 'test failed' }], completed: 0 },
    artifacts: [{ path: 'artifacts/report.json', sha256: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', kind: 'report' }],
  });
  assert.equal(snapshot.schema, 'mansoor.antigravity-control-plane/v1');
  assert.equal(snapshot.phase, 'blocked');
  assert.equal(snapshot.progress, 60);
  assert.equal(snapshot.model.backend, 'local');
  assert.equal(snapshot.workers[0].workerId, 'worker-a');
  assert.equal(snapshot.blockers[0].details, 'test failed');
  assert.match(JSON.stringify(snapshot), /REDACTED_SECRET/);
  assert.doesNotMatch(JSON.stringify(snapshot), /token=hidden/);
});

test('allows one retry for a matching recoverable failure and escalates the second attempt', async () => {
  const fixture = runFixture();
  try {
    const submitted = enqueueRun({ runsDir: fixture.runsDir, input: { projectDir: fixture.root, projectId: 'project-1', taskId: 'task-1', objective: 'Fix', scope: ['src/**'], acceptance: ['test'] } });
    updateRun({ runsDir: fixture.runsDir, runId: submitted.runId, patch: { status: 'recoverable-failure', failureSignature: 'sig-1', failureCode: 'test-failure', retryCount: 0 } });
    const deps = { runsDir: fixture.runsDir, now: () => '2026-11-24T00:00:00.000Z' };
    const first = await handleProtocolRequest({ method: 'retry', runId: submitted.runId, projectId: 'project-1', taskId: 'task-1', stage: 'verification', failureSignature: 'sig-1' }, deps);
    assert.equal(first.ok, true);
    assert.equal(first.run.retryCount, 1);
    assert.equal(first.run.status, 'queued-host-unavailable');
    const second = await handleProtocolRequest({ method: 'retry', runId: submitted.runId, projectId: 'project-1', taskId: 'task-1', stage: 'verification', failureSignature: 'sig-1' }, deps);
    assert.equal(second.ok, false);
    assert.equal(second.error, 'retry-budget-exhausted');
    assert.equal(getRun({ runsDir: fixture.runsDir, runId: submitted.runId }).retryCount, 1);
  } finally { fs.rmSync(fixture.root, { recursive: true, force: true }); }
});

test('resume and retry reject identity mismatches and high-risk failure codes', async () => {
  const fixture = runFixture();
  try {
    const submitted = enqueueRun({ runsDir: fixture.runsDir, input: { projectDir: fixture.root, projectId: 'project-1', taskId: 'task-1', objective: 'Fix', scope: ['src/**'], acceptance: ['test'] } });
    updateRun({ runsDir: fixture.runsDir, runId: submitted.runId, patch: { status: 'recoverable-failure', failureSignature: 'sig-2', failureCode: 'security-failure' } });
    const deps = { runsDir: fixture.runsDir, now: () => '2026-11-24T00:00:00.000Z' };
    const status = await handleProtocolRequest({ method: 'status', runId: submitted.runId, projectId: 'wrong-project' }, deps);
    assert.equal(status.error, 'project-identity-mismatch');
    const resume = await handleProtocolRequest({ method: 'resume', runId: submitted.runId, projectId: 'wrong-project', taskId: 'task-1' }, deps);
    assert.equal(resume.error, 'project-identity-mismatch');
    const retry = await handleProtocolRequest({ method: 'retry', runId: submitted.runId, projectId: 'project-1', taskId: 'task-1', stage: 'verification', failureSignature: 'sig-2' }, deps);
    assert.equal(retry.error, 'retry-not-allowed');
    const missingIdentity = await handleProtocolRequest({ method: 'resume', runId: submitted.runId }, deps);
    assert.equal(missingIdentity.error, 'run-identity-required');
  } finally { fs.rmSync(fixture.root, { recursive: true, force: true }); }
});

test('MCP exposes control-plane tools and keeps snapshot/artifacts read-only and scoped', async () => {
  const run = { runId: 'RUN-2', projectId: 'project-1', taskId: 'task-2', status: 'completed', updatedAt: '2026-11-24T00:00:00.000Z', blockers: [], artifacts: [{ path: 'artifacts/report.json', sha256: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', kind: 'report' }] };
  const events = [{ kind: 'completed', status: 'completed', message: 'done', evidenceIds: ['evidence-1'] }];
  const server = createManagedMcpServer({ daemonClientFactory: async () => ({ request: async ({ method }) => method === 'status' ? { ok: true, run } : { ok: true, events }, close() {} }) });
  const listed = await server.handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
  const names = listed.result.tools.map((tool) => tool.name);
  for (const name of ['get_control_plane_snapshot', 'resume_controlled_run', 'retry_run_stage', 'get_run_artifacts']) assert.ok(names.includes(name), name);
  const snapshot = await server.handleRequest({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_control_plane_snapshot', arguments: { runId: run.runId } } });
  const snapshotPayload = JSON.parse(snapshot.result.content[0].text);
  assert.equal(snapshotPayload.schema, 'mansoor.antigravity-control-plane/v1');
  assert.equal(snapshotPayload.status, 'completed');
  const artifacts = await server.handleRequest({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_run_artifacts', arguments: { runId: run.runId } } });
  const artifactPayload = JSON.parse(artifacts.result.content[0].text);
  assert.equal(artifactPayload.artifacts[0].sha256.startsWith('sha256:'), true);
  assert.deepEqual(collectVerifiedArtifacts(run.artifacts), artifactPayload.artifacts);
});

test('control-plane snapshot additively exposes context telemetry and handoff metadata', () => {
  const snapshot = buildControlPlaneSnapshot({
    run: {
      runId: 'RUN-CONTEXT', projectId: 'project-1', taskId: 'task-3', status: 'completed',
      contextTelemetry: { version: 'v2', estimated_tokens: 120, cache_hit: true },
      handoff: { summary: 'verified', changed_paths: ['src/a.ts'] },
    },
  });
  assert.deepEqual(snapshot.contextTelemetry, { version: 'v2', estimated_tokens: 120, cache_hit: true });
  assert.deepEqual(snapshot.handoff, { summary: 'verified', changed_paths: ['src/a.ts'] });
});

test('control-plane v1 golden snapshot remains unchanged when v2 telemetry is absent', () => {
  const expected = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tools', 'tests', 'fixtures', 'control_plane_v1_snapshot.golden.json'), 'utf8'));
  const actual = buildControlPlaneSnapshot({ run: { runId: 'gate-run', projectId: 'gate-project', taskId: 'gate-task', status: 'completed', updatedAt: '2026-01-01T00:00:00.000Z', objective: 'phase-0-gate' }, events: [] });
  assert.deepEqual(actual, expected);
});
