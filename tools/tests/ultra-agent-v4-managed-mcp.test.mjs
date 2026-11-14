import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { createManagedMcpServer } from '../ultra-agent-v4/mcp-server.mjs';
import { evaluatePreToolUse } from '../antigravity-pretool-guard.mjs';

function git(cwd, args) {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}

function projectFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'managed-mcp-'));
  const projectDir = path.join(root, 'repo');
  fs.mkdirSync(projectDir);
  git(projectDir, ['init', '-q']);
  git(projectDir, ['config', 'user.name', 'MCP Fixture']);
  git(projectDir, ['config', 'user.email', 'mcp-fixture@example.invalid']);
  git(projectDir, ['config', 'core.autocrlf', 'false']);
  fs.writeFileSync(path.join(projectDir, 'README.md'), 'base\n');
  git(projectDir, ['add', 'README.md']);
  git(projectDir, ['commit', '-qm', 'base']);
  return { root, projectDir, workspaceRoot: path.join(root, 'plugin-data', 'workspaces') };
}

function taskAndPlan(projectDir) {
  return {
    task: {
      taskId: 'mcp-task-1', projectId: 'fixture', projectDir,
      objective: 'Add one managed file', scope: ['src/**'], acceptance: ['src/hello.txt contains hello'],
      requiredEvidence: ['check:node-version'],
    },
    plan: {
      steps: ['Create the scoped file', 'Run the node version check'], assumptions: [],
      affectedPaths: ['src/hello.txt'], rollback: 'Discard the reviewed task worktree',
      checks: [{ id: 'node-version', required: true, tool: process.execPath, args: ['--version'], cwd: projectDir }],
    },
    actions: [{ type: 'write', path: 'src/hello.txt', content: 'hello\n' }],
  };
}

test('Antigravity MCP task execution and promotion calls always require fresh owner approval', () => {
  for (const toolName of ['run_managed_task', 'promote_reviewed_patch', 'discard_task_workspace']) {
    const result = evaluatePreToolUse({
      toolCall: { name: 'call_mcp_tool', args: { ServerName: 'mansoor-managed-runtime', ToolName: toolName, Arguments: {} } },
    });
    assert.equal(result.decision, 'force_ask', toolName);
  }
  for (const toolName of ['inspect_task_workspace', 'prepare_managed_action', 'get_review_patch']) {
    const result = evaluatePreToolUse({
      toolCall: { name: 'call_mcp_tool', args: { ServerName: 'mansoor-managed-runtime', ToolName: toolName, Arguments: {} } },
    });
    assert.equal(result.decision, 'allow', toolName);
  }
});

test('bounded managed runs use the manager broker without a repeated host prompt', () => {
  const result = evaluatePreToolUse({
    toolCall: {
      name: 'call_mcp_tool',
      args: {
        ServerName: 'mansoor-managed-runtime',
        ToolName: 'run_managed_task',
        Arguments: {
          actionManifest: { manifestHash: 'sha256:prepared' },
          task: { objective: 'Update one bounded source file', scope: ['src/**'], taskType: 'implementation' },
          plan: { affectedPaths: ['src/app.js'], rollback: 'discard worktree', steps: ['write'], checks: [] },
          actions: [{ type: 'write', path: 'src/app.js' }],
        },
      },
    },
  });
  assert.equal(result.decision, 'allow');
});

test('MCP server negotiates the protocol and lists the portable managed tools', async () => {
  const server = createManagedMcpServer({ workspaceRoot: 'C:/test/workspaces' });
  const initialized = await server.handleRequest({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
  });
  assert.equal(initialized.result.protocolVersion, '2025-06-18');
  assert.equal(initialized.result.capabilities.tools.listChanged, false);
  const listed = await server.handleRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  const names = listed.result.tools.map((tool) => tool.name);
  assert.deepEqual(names, ['submit_task', 'get_run_status', 'follow_run_events', 'stop_run', 'inspect_task_workspace', 'prepare_managed_action', 'run_managed_task', 'get_review_patch', 'promote_reviewed_patch', 'discard_task_workspace']);
});

test('MCP execution creates a reviewable patch and promotion requires the exact reviewed patch body', async () => {
  const fixture = projectFixture();
  try {
    const server = createManagedMcpServer({ workspaceRoot: fixture.workspaceRoot });
    const args = taskAndPlan(fixture.projectDir);
    const prepared = await server.handleRequest({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'prepare_managed_action', arguments: args } });
    assert.equal(prepared.result.isError, false, JSON.stringify(prepared));
    const manifest = JSON.parse(prepared.result.content[0].text).actionManifest;
    const preparedPayload = JSON.parse(prepared.result.content[0].text);
    assert.equal(preparedPayload.approvalPolicy.riskTier, 0);
    assert.equal(preparedPayload.approvalPolicy.decision, 'auto_approve');
    assert.ok(manifest.manifestHash);
    assert.equal(manifest.actions[0].contentHash.startsWith('sha256:'), true);
    const changedAction = { ...args, actions: [{ type: 'write', path: 'src/hello.txt', content: 'changed\n' }], actionManifest: manifest };
    const mismatch = await server.handleRequest({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'run_managed_task', arguments: changedAction } });
    assert.equal(mismatch.result.isError, true);
    assert.match(mismatch.result.content[0].text, /action-manifest-mismatch/);
    assert.equal(fs.existsSync(path.join(fixture.projectDir, 'src', 'hello.txt')), false);
    const run = await server.handleRequest({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'run_managed_task', arguments: { ...args, actionManifest: manifest } } });
    assert.equal(run.result.isError, false, JSON.stringify(run));
    const result = JSON.parse(run.result.content[0].text);
    assert.equal(result.status, 'complete');
    assert.equal(result.approval.source, 'manager-policy-auto-approval');
    assert.equal(result.riskTier, 0);
    assert.equal(result.approvalMode, 'auto_approve');
    assert.equal(result.delivery.status, 'review-required');
    assert.equal(fs.existsSync(path.join(fixture.projectDir, 'src', 'hello.txt')), false);

    const review = await server.handleRequest({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'get_review_patch', arguments: { workspace: result.workspace } } });
    const patch = JSON.parse(review.result.content[0].text);
    assert.equal(patch.patchHash, result.delivery.patchHash);
    assert.match(patch.patchText, /hello/);

    const patchMismatch = await server.handleRequest({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'promote_reviewed_patch', arguments: { workspace: result.workspace, patchHash: patch.patchHash, ownerReviewedPatch: 'different patch' } } });
    assert.equal(patchMismatch.result.isError, true);
    assert.equal(fs.existsSync(path.join(fixture.projectDir, 'src', 'hello.txt')), false);

    const promoted = await server.handleRequest({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'promote_reviewed_patch', arguments: { workspace: result.workspace, patchHash: patch.patchHash, ownerReviewedPatch: patch.patchText } } });
    const promotion = JSON.parse(promoted.result.content[0].text);
    assert.equal(promotion.status, 'promoted');
    assert.equal(promotion.committed, false);
    assert.equal(fs.readFileSync(path.join(fixture.projectDir, 'src', 'hello.txt'), 'utf8'), 'hello\n');
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('MCP server rejects unknown methods and unknown tool calls without side effects', async () => {
  const server = createManagedMcpServer();
  const method = await server.handleRequest({ jsonrpc: '2.0', id: 10, method: 'unknown/method' });
  assert.equal(method.error.code, -32601);
  const tool = await server.handleRequest({ jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'shell', arguments: { command: 'whoami' } } });
  assert.equal(tool.result.isError, true);
  assert.match(tool.result.content[0].text, /unknown-tool/);
});
