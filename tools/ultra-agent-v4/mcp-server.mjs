#!/usr/bin/env node
import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runManagedTask, promoteManagedTaskWorkspace, discardManagedTaskWorkspace } from './managed-runtime.mjs';
import { inspectTaskWorkspace, readTaskWorkspacePatch } from './task-workspaces.mjs';
import { canonicalHash, createActionManifest } from '../ultra-agent-v5/action-manifest.mjs';
import { createFileBackedApprovalAuthority } from '../ultra-agent-v5/durable-ledger.mjs';
import { connectRuntimeClient } from './daemon/daemon.mjs';

const SUPPORTED_PROTOCOLS = ['2025-06-18', '2025-03-26'];
const SERVER_NAME = 'mansoor-managed-runtime';
const SERVER_VERSION = '1.0.0';
const HUB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const queueTools = [
  {
    name: 'submit_task',
    description: 'Queue a task in the persistent Mansoor CLI runtime. The same run is visible from CLI and Antigravity; execution waits for host session and approval.',
    inputSchema: { type: 'object', properties: { projectDir: { type: 'string' }, projectId: { type: 'string' }, taskId: { type: 'string' }, objective: { type: 'string' }, scope: { type: 'array', items: { type: 'string' } }, acceptance: { type: 'array', items: { type: 'string' } }, mode: { type: 'string', enum: ['fast', 'premium'] } }, required: ['projectDir', 'objective', 'scope', 'acceptance'], additionalProperties: true },
  },
  { name: 'get_run_status', description: 'Read a persistent Mansoor CLI run status.', inputSchema: { type: 'object', properties: { runId: { type: 'string' } }, required: ['runId'], additionalProperties: false } },
  { name: 'follow_run_events', description: 'Read redacted progress, blocker, verification and handoff events from a persistent run.', inputSchema: { type: 'object', properties: { runId: { type: 'string' }, after: { type: 'integer' }, limit: { type: 'integer' } }, required: ['runId'], additionalProperties: false } },
  { name: 'stop_run', description: 'Request cooperative stop for a persistent Mansoor CLI run.', inputSchema: { type: 'object', properties: { runId: { type: 'string' } }, required: ['runId'], additionalProperties: false } },
];

function errorText(error) {
  return String(error?.code || 'managed-mcp-operation-failed');
}

function toolText(value, { isError = false } = {}) {
  return { content: [{ type: 'text', text: JSON.stringify(value) }], isError };
}

function prepareActionManifest(args, { workspaceRoot, hubRoot = HUB_ROOT } = {}) {
  const task = args?.task || {};
  const plan = args?.plan || {};
  const identity = { projectId: String(task.projectId || ''), taskId: String(task.taskId || '') };
  const workspace = inspectTaskWorkspace({ projectDir: task.projectDir, ...identity, workspaceRoot });
  if (!workspace.ok) throw Object.assign(new Error(workspace.reason || 'workspace-inspection-failed'), { code: workspace.reason || 'workspace-inspection-failed' });
  const registry = JSON.parse(fs.readFileSync(path.join(hubRoot, 'shared', 'control-plane', 'rule-registry.json'), 'utf8'));
  return createActionManifest({
    task,
    plan,
    actions: args.actions || [],
    repairActions: args.repairActions || {},
    workspace,
    policy: {
      version: `rule-registry/${registry.schemaVersion || 1}`,
      registryHash: canonicalHash(registry),
      ruleIds: (registry.rules || []).map((rule) => rule.id),
    },
  });
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
  ...queueTools,
  {
    name: 'inspect_task_workspace',
    description: 'Read-only check that the selected project is a clean Git repository and report its base revision and resumable task workspace. Does not create files or a worktree.',
    inputSchema: { type: 'object', properties: { projectDir: { type: 'string' }, projectId: { type: 'string' }, taskId: { type: 'string' } }, required: ['projectDir', 'projectId', 'taskId'], additionalProperties: false },
  },
  {
    name: 'prepare_managed_action',
    description: 'Read-only step: inspect the clean project, canonicalize the exact planned writes and requested check commands, and return a short-lived action manifest. Pass that exact manifest to run_managed_task; execution rejects any changed file, command, scope, policy or base revision.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'object', properties: { projectDir: { type: 'string' }, projectId: { type: 'string' }, taskId: { type: 'string' }, objective: { type: 'string' }, scope: { type: 'array', items: { type: 'string' } }, acceptance: { type: 'array', items: { type: 'string' } }, forbiddenPaths: { type: 'array', items: { type: 'string' } }, requiredEvidence: { type: 'array', items: { type: 'string' } }, projectType: { type: 'string' }, taskType: { type: 'string' }, agent: { type: 'string' } }, required: ['projectDir', 'projectId', 'taskId', 'objective', 'scope', 'acceptance'], additionalProperties: true },
        plan: { type: 'object', properties: { steps: { type: 'array', items: { type: 'string' } }, assumptions: { type: 'array' }, affectedPaths: { type: 'array', items: { type: 'string' } }, checks: { type: 'array', items: { type: 'object' } }, rollback: { type: ['string', 'null'] }, allowedNetwork: { type: 'array', items: { type: 'string' } } }, required: ['steps', 'affectedPaths', 'checks'], additionalProperties: true },
        actions: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, path: { type: 'string' }, content: { type: 'string' } }, required: ['type', 'path', 'content'], additionalProperties: false } },
        repairActions: { type: 'object', additionalProperties: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, path: { type: 'string' }, content: { type: 'string' } }, required: ['type', 'path', 'content'], additionalProperties: false } } },
      },
      required: ['task', 'plan', 'actions'],
      additionalProperties: false,
    },
  },
  {
    name: 'run_managed_task',
    description: 'Execute a prepared action manifest in a detached Git worktree (workspace separation, not an OS sandbox). The durable local ledger binds the receipt, policy, effects and verification to this exact manifest. The host may request fresh review, but no host-signed human identity attestation is available; hook failure behavior is not guaranteed by the public contract.',
    inputSchema: {
      type: 'object',
      properties: {
        actionManifest: { type: 'object', description: 'Exact unmodified manifest returned by prepare_managed_action.', additionalProperties: true },
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
            checks: { type: 'array', items: { type: 'object' } }, rollback: { type: ['string', 'null'] }, allowedNetwork: { type: 'array', items: { type: 'string' } },
          },
          required: ['steps', 'affectedPaths', 'checks'],
          additionalProperties: true,
        },
        actions: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, path: { type: 'string' }, content: { type: 'string' } }, required: ['type', 'path', 'content'], additionalProperties: false } },
        repairActions: { type: 'object', additionalProperties: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, path: { type: 'string' }, content: { type: 'string' } }, required: ['type', 'path', 'content'], additionalProperties: false } } },
      },
      required: ['task', 'plan', 'actions', 'actionManifest'],
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

export function createManagedMcpServer({ workspaceRoot = process.env.MANSOOR_WORKSPACE_ROOT, hubRoot, daemonClientFactory = async () => connectRuntimeClient() } = {}) {
  const runtimeDeps = {
    workspaceRoot,
    approvalAuthorityFactory: async (_manifest, ledger) => createFileBackedApprovalAuthority(ledger.directory),
    ...(hubRoot ? { hubRoot } : {}),
  };

  async function callTool(name, args = {}) {
    if (!args || typeof args !== 'object' || Array.isArray(args)) return toolText({ status: 'blocked', reason: 'tool-arguments-must-be-an-object' }, { isError: true });
    try {
      if (['submit_task', 'get_run_status', 'follow_run_events', 'stop_run'].includes(name)) {
        let client;
        try { client = await daemonClientFactory(); }
        catch (error) { return toolText({ status: 'queued-host-unavailable', providerFallback: false, reason: String(error.code || error.message || 'daemon-unavailable') }); }
        try {
          const method = name === 'submit_task' ? 'submit' : name === 'get_run_status' ? 'status' : name === 'follow_run_events' ? 'events' : 'stop';
          const request = name === 'submit_task' ? { method, input: args } : { method, ...args };
          return toolText(await client.request(request));
        } finally { client.close(); }
      }
      if (name === 'inspect_task_workspace') {
        const result = inspectTaskWorkspace({ ...args, workspaceRoot });
        return toolText({ status: result.ok ? 'ready' : 'blocked', ...result });
      }
      if (name === 'prepare_managed_action') {
        const manifest = prepareActionManifest(args, { workspaceRoot, hubRoot: runtimeDeps.hubRoot });
        return toolText({ status: 'ready', actionManifest: manifest, nextAction: 'pass-this-manifest-unchanged-to-run_managed_task' });
      }
      if (name === 'run_managed_task') {
        if (!args.actionManifest || typeof args.actionManifest !== 'object' || Array.isArray(args.actionManifest)) {
          return toolText({ status: 'blocked', reason: 'action-manifest-required' }, { isError: true });
        }
        const result = await runManagedTask(args, {
          ...runtimeDeps,
          // The PreToolUse hook requests a fresh review of this exact tool call.
          // This receipt binds the accepted invocation; it is not a host-signed
          // assertion of a human identity or of OS-level containment.
          approvePlan: async (manifest, authority) => authority.issue(manifest, {
            approved: true,
            actor: 'host-invocation',
            source: 'antigravity-tool-call-host-review-unattested',
            manifestHash: manifest.manifestHash,
            nonce: manifest.nonce,
          }),
        });
        return toolText(result, { isError: result.status === 'blocked' || result.status === 'escalated' });
      }
      if (name === 'get_review_patch') return toolText(readTaskWorkspacePatch(args.workspace));
      if (name === 'promote_reviewed_patch') {
        const review = readTaskWorkspacePatch(args.workspace);
        if (args.patchHash !== review.patchHash || args.ownerReviewedPatch !== review.patchText) {
          return toolText({ status: 'blocked', reason: 'owner-reviewed-patch-mismatch', patchHash: review.patchHash }, { isError: true });
        }
        const promoted = promoteManagedTaskWorkspace(args.workspace, {
          approved: true,
          actor: 'host-invocation',
          patchHash: review.patchHash,
        });
        return toolText(promoted, { isError: promoted.status === 'blocked' });
      }
      if (name === 'discard_task_workspace') {
        const discarded = discardManagedTaskWorkspace(args.workspace, { approved: true, actor: 'host-invocation' });
        return toolText(discarded, { isError: discarded.status === 'blocked' });
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
