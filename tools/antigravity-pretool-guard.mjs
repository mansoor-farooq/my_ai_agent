#!/usr/bin/env node
import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyRisk } from './ultra-agent-v5/approval-broker.mjs';
import { classifyCommand } from './ultra-agent-v5/command-approval-policy.mjs';

const mutatingTool = /(?:write|edit|replace|patch|delete|remove|move|rename|mkdir|create|apply_diff)/i;
// Antigravity can expose the same safe read as view_file or read_file
// depending on the host/tool version. Keep all read-only variants in one
// allowlist so reading a project README does not become an owner prompt.
const readOnlyTool = /^(?:view_file|read_file|read_text_file|list_dir|list_files|find_by_name|grep_search|search_web|read_url_content|browser_.*)$/i;
const pathKeys = new Set(['targetfile', 'path', 'filepath', 'file_path', 'targetpath', 'target_path', 'absolutepath', 'directorypath', 'directory_path', 'file', 'filename']);
const privateFile = /^(?:\.env(?:\..*)?|\.git|id_rsa(?:\.pub)?|id_ed25519(?:\.pub)?|.*\.(?:pem|key|p12|pfx|keystore))$/i;
const managedMcpReadTools = new Set(['inspect_task_workspace', 'prepare_managed_action', 'get_review_patch']);
const managedMcpApprovalTools = new Set(['run_managed_task', 'promote_reviewed_patch', 'discard_task_workspace']);

function response(decision, reason) {
  return reason ? { decision, reason } : { decision };
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseEmbeddedJson(text) {
  const source = String(text || '').replace(/^\uFEFF/, '').replace(/^\0+|\0+$/g, '').trim();
  if (!source) return [];
  const candidates = [];
  try { candidates.push(JSON.parse(source)); } catch { /* try framed payloads below */ }
  for (const line of source.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)) {
    try { candidates.push(JSON.parse(line)); } catch { /* keep scanning */ }
  }
  for (let start = 0; start < source.length; start += 1) {
    if (source[start] !== '{' && source[start] !== '[') continue;
    const opening = source[start];
    const closing = opening === '{' ? '}' : ']';
    let depth = 0;
    let quote = false;
    let escaped = false;
    for (let index = start; index < source.length; index += 1) {
      const character = source[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') quote = false;
        continue;
      }
      if (character === '"') { quote = true; continue; }
      if (character === opening) depth += 1;
      else if (character === closing) depth -= 1;
      if (depth === 0) {
        try { candidates.push(JSON.parse(source.slice(start, index + 1))); } catch { /* not a complete JSON object */ }
        break;
      }
    }
  }
  return candidates;
}

function parseArguments(value) {
  if (isObject(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeToolCall(value) {
  if (!isObject(value)) return null;
  const nested = value.toolCall ?? value.tool_call ?? (isObject(value.tool) ? value.tool : null) ?? value.call;
  if (isObject(nested)) {
    const name = nested.name ?? nested.toolName ?? nested.tool_name;
    if (typeof name === 'string' && name.trim()) {
      const args = nested.args ?? nested.arguments ?? nested.toolInput ?? nested.tool_input ?? nested.params ?? {};
      return { name: name.trim(), args: parseArguments(args) };
    }
  }
  const directName = value.toolName ?? value.tool_name ?? (typeof value.tool === 'string' ? value.tool : null) ?? value.name;
  if (typeof directName !== 'string' || !directName.trim()) return null;
  const directArgs = value.args ?? value.arguments ?? value.toolInput ?? value.tool_input ?? value.params ?? {};
  return { name: directName.trim(), args: parseArguments(directArgs) };
}

function normalizeHookObject(input) {
  if (!isObject(input)) return null;
  const queue = [input];
  const visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!isObject(current) || visited.has(current)) continue;
    visited.add(current);
    const toolCall = normalizeToolCall(current);
    if (toolCall) {
      const workspacePaths = current.workspacePaths ?? current.workspace_paths ?? input.workspacePaths ?? input.workspace_paths;
      return {
        ...input,
        ...current,
        toolCall,
        workspacePaths: Array.isArray(workspacePaths) ? workspacePaths : (typeof workspacePaths === 'string' ? [workspacePaths] : []),
      };
    }
    for (const key of ['payload', 'request', 'event', 'data', 'input', 'hookInput']) {
      if (isObject(current[key])) queue.push(current[key]);
    }
  }
  return null;
}

/**
 * Antigravity documents one JSON object on stdin, but the host can add a BOM
 * or framing/newline data when a PowerShell command wrapper is involved. Parse
 * only an object containing a recognizable tool call; everything else stays
 * fail-closed and returns null.
 */
export function parsePreToolInput(input) {
  if (isObject(input)) return normalizeHookObject(input);
  if (typeof input !== 'string') return null;
  for (const candidate of parseEmbeddedJson(input)) {
    const normalized = normalizeHookObject(candidate);
    if (normalized) return normalized;
  }
  return null;
}

function collectPaths(value, results = []) {
  if (!value || typeof value !== 'object') return results;
  for (const [name, child] of Object.entries(value)) {
    const normalizedKey = name.toLowerCase();
    if (typeof child === 'string' && pathKeys.has(normalizedKey)) results.push(child);
    else if (Array.isArray(child) && pathKeys.has(normalizedKey)) results.push(...child.filter((entry) => typeof entry === 'string'));
    else if (child && typeof child === 'object') collectPaths(child, results);
  }
  return results;
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function canonicalTarget(root, raw) {
  if (typeof raw !== 'string' || !raw.trim() || raw.includes('\0')) return null;
  const normalized = raw.replace(/[\\/]+/g, path.sep);
  const segments = normalized.split(path.sep).filter(Boolean);
  if (segments.includes('..')) return null;
  const candidate = path.isAbsolute(normalized) ? path.resolve(normalized) : path.resolve(root, normalized);
  const rootReal = realpathSync.native(root);
  let existing = candidate;
  const suffix = [];
  while (!existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) return null;
    suffix.unshift(path.basename(existing));
    existing = parent;
  }
  let resolvedExisting;
  try { resolvedExisting = realpathSync.native(existing); } catch { return null; }
  const resolvedCandidate = path.resolve(resolvedExisting, ...suffix);
  if (!isInside(rootReal, resolvedCandidate)) return null;
  const relative = path.relative(rootReal, resolvedCandidate);
  const parts = relative.split(path.sep).filter(Boolean);
  if (parts.some((part) => privateFile.test(part)) || parts.some((part) => part.toLowerCase() === 'requirements')) return null;
  return resolvedCandidate;
}

function managedMcpTool(name, args) {
  const normalizedName = name.toLowerCase();
  const serverName = String(args?.ServerName ?? args?.serverName ?? args?.server_name ?? '').toLowerCase();
  const toolName = String(args?.ToolName ?? args?.toolName ?? args?.tool_name ?? '').toLowerCase();
  if (/^call_mcp_tool$/i.test(name)) {
    return ['mansoor-managed-runtime', 'runtime'].includes(serverName) ? toolName : null;
  }
  if (normalizedName.startsWith('mcp_') && normalizedName.includes('mansoor-agent-hub') && (normalizedName.includes('_runtime_') || normalizedName.includes('managed-runtime'))) {
    for (const candidate of [...managedMcpReadTools, ...managedMcpApprovalTools]) {
      if (normalizedName.endsWith(candidate)) return candidate;
    }
  }
  if (/^mcp:/i.test(name) && (normalizedName.includes('mansoor-managed-runtime') || normalizedName.includes('mansoor-agent-hub/runtime'))) {
    const candidate = normalizedName.split(/[/:]/).at(-1);
    if ([...managedMcpReadTools, ...managedMcpApprovalTools].includes(candidate)) return candidate;
  }
  return null;
}

function managedMcpArguments(args = {}) {
  if (args && typeof args.Arguments === 'object' && !Array.isArray(args.Arguments)) return args.Arguments;
  if (args && typeof args.arguments === 'object' && !Array.isArray(args.arguments)) return args.arguments;
  return args;
}

function isBoundedManagedRun(args = {}) {
  const payload = managedMcpArguments(args);
  if (!payload.actionManifest || !payload.task || !payload.plan) return false;
  try {
    const decision = classifyRisk({ task: payload.task, plan: payload.plan, actions: payload.actions, manifest: payload.actionManifest });
    return decision.riskTier <= 1 && decision.requiresOwner === false;
  } catch {
    return false;
  }
}

export function evaluatePreToolUse(input = {}) {
  const normalized = parsePreToolInput(input);
  const name = normalized?.toolCall?.name;
  const args = normalized?.toolCall?.args;
  if (typeof name !== 'string') return response('deny', 'Pre-tool guard received a malformed call; blocked by default.');
  const managedTool = managedMcpTool(name, args);
  if (managedTool && managedMcpReadTools.has(managedTool)) return response('allow');
  if (managedTool && managedMcpApprovalTools.has(managedTool)) {
    if (managedTool === 'run_managed_task' && isBoundedManagedRun(args)) return response('allow', 'Bounded managed run is authorized by the Mansoor policy broker; Tier 3 actions still require owner review.');
    return response('force_ask', `Managed MCP action ${managedTool} requires fresh owner review.`);
  }
  if (/^run_command$/i.test(name)) {
    const command = args?.CommandLine ?? args?.commandLine ?? args?.command ?? args?.cmd ?? '';
    const commandDecision = classifyCommand({ command, workspacePaths: normalized.workspacePaths });
    if (commandDecision.decision === 'auto_approve') return response('allow', commandDecision.reason);
    if (commandDecision.decision === 'deny') return response('deny', commandDecision.reason);
    return response('force_ask', commandDecision.reason);
  }
  if (readOnlyTool.test(name)) return response('allow');
  if (!mutatingTool.test(name)) return response('force_ask', 'Unclassified Antigravity tool requires owner review.');
  const rawPaths = collectPaths(args);
  const workspaces = (Array.isArray(normalized.workspacePaths) ? normalized.workspacePaths : [normalized.workspacePaths]).filter((item) => typeof item === 'string');
  if (!rawPaths.length || !workspaces.length) return response('deny', 'File mutation lacks a target path or active workspace; blocked by default.');
  for (const raw of rawPaths) {
    let safe = false;
    for (const workspace of workspaces) {
      try {
        const root = realpathSync.native(workspace);
        if (canonicalTarget(root, raw)) { safe = true; break; }
      } catch { /* invalid workspace fails closed */ }
    }
    if (!safe) return response('deny', `Blocked unsafe or protected file target: ${raw}`);
  }
  // In-workspace mutations are already bounded by canonicalTarget(): the path
  // must resolve inside an active workspace and protected files are rejected.
  // Allowing this scoped class is what lets the manager run a multi-step plan
  // without asking the owner once per file. Sensitive, out-of-workspace and
  // protected targets still fail closed above; Tier 2/3 effects remain gated
  // by the managed approval broker.
  return response('allow', 'In-workspace mutation is allowed by the scoped Mansoor policy; protected and out-of-workspace targets remain denied.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  let result;
  try {
    const parsed = parsePreToolInput(input);
    result = parsed ? evaluatePreToolUse(parsed) : response('deny', 'Pre-tool guard received an invalid hook payload; blocked safely.');
  } catch {
    result = response('deny', 'Pre-tool guard failed safely while evaluating the hook payload.');
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
