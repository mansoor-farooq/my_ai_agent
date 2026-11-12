#!/usr/bin/env node
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runManagedTask, promoteTaskWorkspace, discardTaskWorkspace } from './managed-runtime.mjs';
import { inspectTaskWorkspace, readTaskWorkspacePatch } from './task-workspaces.mjs';

const SUPPORTED_PROTOCOLS = ['2025-06-18', '2025-03-26'];
const SERVER_NAME = 'mansoor-managed-runtime';
const SERVER_VERSION = '1.0.0';
const REVIEW_ONLY_TOOLS = new Set(['inspect_task_workspace', 'get_review_patch']);

function errorText(error) {
  return String(error?.code || 'managed-mcp-operation-failed');
}

function toolText(value, { isError = false } = {}) {
  return { content: [{ type: 'text', text: JSON.stringify(value) }], isError };
}

const workspaceShape = {
  type: 'object',
  description: 'Workspace identity returned by run_managed_task; pass it back unchanged.',
  properties: {
    workspaceId: { type: 'string' },
    taskId: { type: 'string' },
    projectId: { type: 'string' },
    repoRoot: { type: 'string' },
    workspaceRoot: { type: 'string' },
    workspaceDir: { type: 'string' },
    baseRevision: { type: 'string' },
    planHash: { type: 'string' },
    patchHash: { type: 'string' },
  },
  required: ['workspaceId', 'taskId', 'projectId', 'repoRoot', 'workspaceRoot', 'workspaceDir', 'baseRevision', 'planHash'],
  additionalProperties: true,
};

const tools = [
  {
    name: 'inspect_task_workspace',
    description: 'Read-only check that the selected project is a clean Git repository and report its base revision and resumable task workspace. Does not create files or a worktree.',
    inputSchema: { type: 'object', properties: { projectDir: { type: 'string' }, projectId: { type: 'string' }, taskId: { type: 'string' } }, required: ['projectDir', 'projectId', 'taskId'], additionalProperties: false },
  },
  {
    name: 'run_managed_task',
    description: 'Execute an owner-reviewed plan in an isolated Git worktree. Antigravity forces a fresh owner approval before this tool runs. Writes and registered checks run in the worktree; success returns a patch for separate review and promotion.',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'object',
          properties: {
            projectDir: { type: 'string' }, projectId: { type: 'string' }, taskId: { type: 'string' }, objective: { type: 'string' },
            scope: { type: 'array', items: { type: 'string' } }, acceptance: { type: 'array', items: { type: 'string' } },
            forbiddenPaths: { type: 'array', items: { type: 'string' } }, requiredEvidence: { type: 'array', items: { type: 'string' } },
            projectType: { type: 'string' }, taskType: { type: 'string' }, agent: { type: 'string' },
          },
          required: ['projectDir', 'projectId', 'taskId', 'objective', 'scope', 'acceptance'],
          additionalProperties: true,
        },
        plan: {
          type: 'object',
          properties: {
            steps: { type: 'array', items: { type: 'string' } }, assumptions: { type: 'array' }, affectedPaths: { type: 'array', items: { type: 'string' } },
            checks: { type: 'array', items: { type: 'object' } }, rollback: { type: ['string', 'null'] },
          },
          required: ['steps', 'affectedPaths', 'checks'],
          additionalProperties: true,
        },
        actions: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, path: { type: 'string' }, content: { type: 'string' } }, required: ['type', 'path', 'content'], additionalProperties: false } },
      },
      required: ['task', 'plan', 'actions'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_review_patch',
    description: 'Read and verify the exact patch produced by a managed task. Returns the changed-path list, hash and patch text for owner review.',
    inputSchema: { type: 'object', properties: { workspace: workspaceShape }, required: ['workspace'], additionalProperties: false },
  },
  {
    name: 'promote_reviewed_patch',
    description: 'Promote only after Antigravity forces fresh owner approval. Supply the exact patch text returned by get_review_patch; it is checked against the stored bytes and SHA-256 hash. Applies and stages the reviewed change without committing or pushing.',
    inputSchema: { type: 'object', properties: { workspace: workspaceShape, patchHash: { type: 'string' }, ownerReviewedPatch: { type: 'string', description: 'Exact patchText from get_review_patch. Antigravity displays it in the approval request.' } }, required: ['workspace', 'patchHash', 'ownerReviewedPatch'], additionalProperties: false },
  },
  {
    name: 'discard_task_workspace',
    description: 'Discard a validated managed task worktree only after Antigravity forces fresh owner approval. This does not modify the project checkout.',
    inputSchema: { type: 'object', properties: { workspace: workspaceShape }, required: ['workspace'], additionalProperties: false },
  },
];

export function createManagedMcpServer({ workspaceRoot = process.env.MANSOOR_WORKSPACE_ROOT, hubRoot } = {}) {
  const runtimeDeps = { workspaceRoot, ...(hubRoot ? { hubRoot } : {}) };

  async function callTool(name, args = {}) {
    if (!args || typeof args !== 'object' || Array.isArray(args)) return toolText({ status: 'blocked', reason: 'tool-arguments-must-be-an-object' }, { isError: true });
    try {
      if (name === 'inspect_task_workspace') {
        const result = inspectTaskWorkspace({ ...args, workspaceRoot });
        return toolText({ status: result.ok ? 'ready' : 'blocked', ...result });
      }
      if (name === 'run_managed_task') {
        const result = await runManagedTask(args, {
          ...runtimeDeps,
          // The plugin's PreToolUse hook forces an interactive owner prompt for this MCP tool.
          // The runtime itself still requires this trusted, non-model-authored callback.
          approvePlan: async () => ({ approved: true, actor: 'antigravity-force-ask-gate', approvedAt: new Date().toISOString() }),
        });
        return toolText(result, { isError: result.status === 'blocked' || result.status === 'escalated' });
      }
      if (name === 'get_review_patch') return toolText(readTaskWorkspacePatch(args.workspace));
      if (name === 'promote_reviewed_patch') {
        const review = readTaskWorkspacePatch(args.workspace);
        if (args.patchHash !== review.patchHash || args.ownerReviewedPatch !== review.patchText) {
          return toolText({ status: 'blocked', reason: 'owner-reviewed-patch-mismatch', patchHash: review.patchHash }, { isError: true });
        }
        const promoted = promoteTaskWorkspace(args.workspace, {
          approved: true,
          actor: 'antigravity-force-ask-gate',
          patchHash: review.patchHash,
        });
        return toolText(promoted);
      }
      if (name === 'discard_task_workspace') {
        const discarded = discardTaskWorkspace(args.workspace, { approved: true, actor: 'antigravity-force-ask-gate' });
        return toolText(discarded);
      }
      return toolText({ status: 'blocked', reason: 'unknown-tool' }, { isError: true });
    } catch (error) {
      return toolText({ status: 'blocked', reason: errorText(error) }, { isError: true });
    }
  }

  async function handleRequest(message) {
    if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
      return { jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: 'invalid-request' } };
    }
    const id = message.id;
    if (message.method === 'notifications/initialized' || message.method.startsWith('notifications/')) return null;
    if (message.method === 'initialize') {
      const requested = message.params?.protocolVersion;
      const protocolVersion = SUPPORTED_PROTOCOLS.includes(requested) ? requested : SUPPORTED_PROTOCOLS[0];
      return { jsonrpc: '2.0', id, result: { protocolVersion, capabilities: { tools: { listChanged: false } }, serverInfo: { name: SERVER_NAME, version: SERVER_VERSION } } };
    }
    if (message.method === 'ping') return { jsonrpc: '2.0', id, result: {} };
    if (message.method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools } };
    if (message.method === 'tools/call') {
      const params = message.params || {};
      return { jsonrpc: '2.0', id, result: await callTool(params.name, params.arguments) };
    }
    return { jsonrpc: '2.0', id, error: { code: -32601, message: 'method-not-found' } };
  }

  return { handleRequest, callTool, tools };
}

async function runStdioServer() {
  const server = createManagedMcpServer();
  const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });
  for await (const line of lines) {
    if (!line.trim()) continue;
    let message;
    try { message = JSON.parse(line); }
    catch {
      process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse-error' } })}\n`);
      continue;
    }
    try {
      const response = await server.handleRequest(message);
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    } catch (error) {
      if (message.id !== undefined) process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, error: { code: -32603, message: errorText(error) } })}\n`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runStdioServer().catch((error) => {
    process.stderr.write(`Mansoor managed MCP stopped: ${errorText(error)}\n`);
    process.exitCode = 1;
  });
}
