#!/usr/bin/env node
import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runManagedTask, promoteManagedTaskWorkspace, discardManagedTaskWorkspace } from './managed-runtime.mjs';
import { inspectTaskWorkspace, readTaskWorkspacePatch } from './task-workspaces.mjs';
import { canonicalHash, createActionManifest } from '../ultra-agent-v5/action-manifest.mjs';
import { createFileBackedApprovalAuthority } from '../ultra-agent-v5/durable-ledger.mjs';
import { createApprovalBroker } from '../ultra-agent-v5/approval-broker.mjs';
import { connectRuntimeClient } from './daemon/daemon.mjs';
import { summarizeActivity } from '../ultra-agent-v3/activity.mjs';
import { buildControlPlaneSnapshot, collectVerifiedArtifacts } from '../ultra-agent-v5/control-plane.mjs';
import { createWebAuditReport } from '../web-audit-report.mjs';
import { discoverAuditBrowsers, planAuditBrowserRuns } from '../audit-browser-runtime.mjs';

const SUPPORTED_PROTOCOLS = ['2025-06-18', '2025-03-26'];
const SERVER_NAME = 'mansoor-managed-runtime';
const SERVER_VERSION = '1.0.0';
const HUB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const queueTools = [
  {
    name: 'submit_task',
    description: 'Queue a task in the persistent Mansoor CLI runtime. The same run is visible from CLI and Antigravity; execution waits for host session and approval.',
    inputSchema: { type: 'object', properties: { projectDir: { type: 'string' }, projectId: { type: 'string' }, taskId: { type: 'string' }, objective: { type: 'string' }, scope: { type: 'array', items: { type: 'string' } }, acceptance: { type: 'array', items: { type: 'string' } }, mode: { type: 'string', enum: ['fast', 'premium'] }, autonomy: { type: 'string', enum: ['managed', 'turbo', 'turbo-autonomous'] }, parallelize: { type: 'boolean' }, maxParallel: { type: 'integer', minimum: 1, maximum: 20 } }, required: ['projectDir', 'objective', 'scope', 'acceptance'], additionalProperties: true },
  },
  { name: 'get_run_status', description: 'Read a persistent Mansoor CLI run status.', inputSchema: { type: 'object', properties: { runId: { type: 'string' } }, required: ['runId'], additionalProperties: false } },
  { name: 'follow_run_events', description: 'Read redacted progress, blocker, verification and handoff events from a persistent run.', inputSchema: { type: 'object', properties: { runId: { type: 'string' }, after: { type: 'integer' }, limit: { type: 'integer' } }, required: ['runId'], additionalProperties: false } },
  { name: 'stop_run', description: 'Request cooperative stop for a persistent Mansoor CLI run.', inputSchema: { type: 'object', properties: { runId: { type: 'string' } }, required: ['runId'], additionalProperties: false } },
  { name: 'get_runtime_health', description: 'Read-only daemon/host health for native Antigravity control-plane recovery. Does not alter permissions or restart processes.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'get_control_plane_snapshot', description: 'Read a deterministic Native Antigravity Control Plane snapshot for a persistent run: phase, progress, workers, blockers, evidence, artifacts, model state and next actions.', inputSchema: { type: 'object', properties: { runId: { type: 'string' }, projectDir: { type: 'string' }, projectId: { type: 'string' }, taskId: { type: 'string' }, after: { type: 'integer' }, limit: { type: 'integer' } }, required: ['runId'], additionalProperties: false } },
  { name: 'resume_controlled_run', description: 'Resume a paused, recoverable-failure or host-unavailable run only when its project/task identity matches.', inputSchema: { type: 'object', properties: { runId: { type: 'string' }, projectId: { type: 'string' }, taskId: { type: 'string' } }, required: ['runId', 'projectId', 'taskId'], additionalProperties: false } },
  { name: 'retry_run_stage', description: 'Schedule at most one bounded retry for a matching recoverable stage. Destructive, permission, secret, quota, security and scope failures are rejected.', inputSchema: { type: 'object', properties: { runId: { type: 'string' }, projectId: { type: 'string' }, taskId: { type: 'string' }, stage: { type: 'string' }, failureSignature: { type: 'string' }, failureCode: { type: 'string' } }, required: ['runId', 'projectId', 'taskId', 'stage', 'failureSignature'], additionalProperties: false } },
  { name: 'get_run_artifacts', description: 'Read verified artifact metadata, hashes and checks from a persistent run without exposing arbitrary filesystem paths.', inputSchema: { type: 'object', properties: { runId: { type: 'string' }, projectId: { type: 'string' }, taskId: { type: 'string' } }, required: ['runId'], additionalProperties: false } },
  { name: 'create_web_audit_report', description: 'Create a redacted, deterministic web-audit report from supplied browser/SEO/performance evidence. This is read-only and never invents missing gates.', inputSchema: { type: 'object', properties: { targetUrl: { type: 'string' }, provider: { type: 'string' }, startedAt: { type: 'string' }, checks: { type: 'array' }, lighthouse: { type: ['object', 'null'] } }, required: ['targetUrl', 'checks'], additionalProperties: false } },
  { name: 'get_audit_browser_inventory', description: 'Read-only inventory of locally installed browsers and provider compatibility. Discovery does not launch a browser or claim audit evidence.', inputSchema: { type: 'object', properties: { providers: { type: 'object', properties: { antigravity: { type: 'boolean' }, playwright: { type: 'boolean' }, selenium: { type: 'boolean' } }, additionalProperties: false } }, additionalProperties: false } },
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
        task: { type: 'object', properties: { projectDir: { type: 'string' }, projectId: { type: 'string' }, taskId: { type: 'string' }, objective: { type: 'string' }, scope: { type: 'array', items: { type: 'string' } }, acceptance: { type: 'array', items: { type: 'string' } }, forbiddenPaths: { type: 'array', items: { type: 'string' } }, requiredEvidence: { type: 'array', items: { type: 'string' } }, projectType: { type: 'string' }, taskType: { type: 'string' }, agent: { type: 'string' }, agentId: { type: 'string' }, managerId: { type: 'string' } }, required: ['projectDir', 'projectId', 'taskId', 'objective', 'scope', 'acceptance'], additionalProperties: true },
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
    description: 'Execute a prepared action manifest in a detached Git worktree (workspace separation, not an OS sandbox). The deterministic Approval Broker auto-authorizes bounded Tier 0/1 work as Mansoor AI Team Manager, while Tier 2/3 effects remain owner-review gated. The durable local ledger binds the receipt, policy, effects and verification to this exact manifest; no host-signed human identity attestation or OS sandbox claim is implied.',
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
            projectType: { type: 'string' }, taskType: { type: 'string' }, agent: { type: 'string' }, agentId: { type: 'string' }, managerId: { type: 'string' },
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

export function createManagedMcpServer({ workspaceRoot = process.env.MANSOOR_WORKSPACE_ROOT, hubRoot, daemonClientFactory = async () => connectRuntimeClient(), approvalBroker = createApprovalBroker() } = {}) {
  const runtimeDeps = {
    workspaceRoot,
    approvalBroker,
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
      const daemonRequest = async (request) => {
        let client;
        try { client = await daemonClientFactory(); }
        catch (error) { return { ok: false, error: 'queued-host-unavailable', reason: String(error.code || error.message || 'daemon-unavailable') }; }
        try { return await client.request(request); } finally { client.close(); }
      };
      if (name === 'get_runtime_health') {
        const result = await daemonRequest({ method: 'health' });
        return toolText(result, { isError: result.ok === false });
      }
      if (['resume_controlled_run', 'retry_run_stage'].includes(name)) {
        const method = name === 'resume_controlled_run' ? 'resume' : 'retry';
        const result = await daemonRequest({ method, ...args });
        return toolText(result, { isError: result.ok === false });
      }
      if (name === 'get_control_plane_snapshot') {
        const statusResult = await daemonRequest({ method: 'status', runId: args.runId, projectId: args.projectId, taskId: args.taskId });
        if (!statusResult.ok) return toolText(statusResult, { isError: true });
        const eventsResult = await daemonRequest({ method: 'events', runId: args.runId, after: args.after, limit: args.limit });
        if (!eventsResult.ok) return toolText(eventsResult, { isError: true });
        let activitySummary = null;
        if (args.projectDir && statusResult.run?.taskId) {
          try { activitySummary = summarizeActivity({ dir: args.projectDir, project: args.projectId || statusResult.run.projectId, taskId: args.taskId || statusResult.run.taskId }); } catch { activitySummary = null; }
        }
        return toolText(buildControlPlaneSnapshot({ run: statusResult.run, events: eventsResult.events, activitySummary, artifacts: statusResult.run.artifacts || [], model: args.model }));
      }
      if (name === 'get_run_artifacts') {
        const statusResult = await daemonRequest({ method: 'status', runId: args.runId, projectId: args.projectId, taskId: args.taskId });
        if (!statusResult.ok) return toolText(statusResult, { isError: true });
        return toolText({ schema: 'mansoor.antigravity-run-artifacts/v1', runId: statusResult.run.runId, artifacts: collectVerifiedArtifacts(statusResult.run.artifacts || []) });
      }
      if (name === 'create_web_audit_report') {
        const report = createWebAuditReport({ targetUrl: args.targetUrl, provider: args.provider, startedAt: args.startedAt, checks: args.checks, lighthouse: args.lighthouse });
        return toolText(report, { isError: report.status === 'fail' || report.status === 'blocked' });
      }
      if (name === 'get_audit_browser_inventory') {
        const inventory = discoverAuditBrowsers();
        return toolText({ inventory, runPlan: planAuditBrowserRuns({ browsers: inventory.browsers, providers: args.providers || {} }) });
      }
      if (name === 'inspect_task_workspace') {
        const result = inspectTaskWorkspace({ ...args, workspaceRoot });
        return toolText({ status: result.ok ? 'ready' : 'blocked', ...result });
      }
      if (name === 'prepare_managed_action') {
        const manifest = prepareActionManifest(args, { workspaceRoot, hubRoot: runtimeDeps.hubRoot });
        const approvalPolicy = approvalBroker.evaluate({ task: args.task, plan: args.plan, actions: args.actions, manifest });
        return toolText({ status: 'ready', actionManifest: manifest, approvalPolicy, nextAction: 'pass-this-manifest-unchanged-to-run_managed_task' });
      }
      if (name === 'run_managed_task') {
        if (!args.actionManifest || typeof args.actionManifest !== 'object' || Array.isArray(args.actionManifest)) {
          return toolText({ status: 'blocked', reason: 'action-manifest-required' }, { isError: true });
        }
        const result = await runManagedTask(args, {
          ...runtimeDeps,
          ownerApprove: async (manifest, approval, authority) => {
            return authority.issue(manifest, { ...approval, actor: 'host-invocation', source: 'antigravity-tool-call-host-review-unattested' });
          },
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
