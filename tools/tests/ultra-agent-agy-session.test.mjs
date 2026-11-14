import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAgyArgs, parseAgyStreamLine, sessionStatus } from '../ultra-agent-v4/agy-session.mjs';
import { createManagedMcpServer } from '../ultra-agent-v4/mcp-server.mjs';

test('buildAgyArgs selects Mansoor manager and keeps project/session options explicit', () => {
  const args = buildAgyArgs({ agent: 'Mansoor AI Team Manager', projectDir: 'E:\\Work\\Inventory', mode: 'fast' });
  assert.deepEqual(args, [
    '--print', '--input-format', 'stream-json', '--output-format', 'stream-json',
    '--agent', 'Mansoor AI Team Manager', '--project', 'E:\\Work\\Inventory',
    '--model', 'Gemini 3.8 Flash', '--effort', 'low',
  ]);
});

test('parseAgyStreamLine redacts host secrets and preserves progress metadata', () => {
  const result = parseAgyStreamLine('{"type":"progress","message":"token=hidden","status":"running"}');
  assert.equal(result.type, 'progress');
  assert.match(result.message, /REDACTED_SECRET/);
  assert.doesNotMatch(result.message, /hidden/);
});

test('sessionStatus reports host unavailable without provider fallback', () => {
  assert.deepEqual(sessionStatus({ available: false }), { status: 'queued-host-unavailable', providerFallback: false });
});

test('MCP queue tools share the injected daemon client', async () => {
  const requests = [];
  const server = createManagedMcpServer({
    workspaceRoot: 'E:\\Workspaces',
    daemonClientFactory: async () => ({
      request: async (request) => { requests.push(request); return { ok: true, run: { runId: 'RUN-1', status: 'queued-host-unavailable' } }; },
      close() {},
    }),
  });
  const result = await server.callTool('submit_task', { projectDir: 'E:\\Work\\Inventory', objective: 'Inspect inventory', scope: ['lib/**'], acceptance: ['report'], mode: 'fast' });
  assert.equal(JSON.parse(result.content[0].text).run.status, 'queued-host-unavailable');
  assert.equal(requests[0].method, 'submit');
});

test('existing managed MCP tools remain present alongside queue tools', () => {
  const names = createManagedMcpServer({ workspaceRoot: 'E:\\Workspaces' }).tools.map((tool) => tool.name);
  for (const name of ['inspect_task_workspace', 'prepare_managed_action', 'run_managed_task', 'get_review_patch', 'promote_reviewed_patch', 'discard_task_workspace', 'submit_task', 'get_run_status', 'follow_run_events', 'stop_run']) assert.ok(names.includes(name), name);
});
