import assert from 'node:assert/strict';
import test from 'node:test';
import { createManagedMcpServer } from '../ultra-agent-v4/mcp-server.mjs';

test('managed MCP advertises a read-only prepare step before the approved execution tool', () => {
  const server = createManagedMcpServer();
  const names = server.tools.map((tool) => tool.name);
  assert.ok(names.includes('prepare_managed_action'));
  assert.ok(names.indexOf('prepare_managed_action') < names.indexOf('run_managed_task'));
});

test('managed MCP blocks execution without the exact prepared action manifest', async () => {
  const server = createManagedMcpServer();
  const result = await server.callTool('run_managed_task', {});
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /action-manifest-required/);
});
