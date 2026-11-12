#!/usr/bin/env node
import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mutatingTool = /(?:write|edit|replace|patch|delete|remove|move|rename|mkdir|create|apply_diff)/i;
const readOnlyTool = /^(?:view_file|list_dir|find_by_name|grep_search|search_web|read_url_content|browser_.*)$/i;
const pathKeys = new Set(['targetfile', 'path', 'filepath', 'file_path', 'targetpath', 'target_path', 'absolutepath', 'directorypath', 'directory_path', 'file', 'filename']);
const privateFile = /^(?:\.env(?:\..*)?|\.git|id_rsa(?:\.pub)?|id_ed25519(?:\.pub)?|.*\.(?:pem|key|p12|pfx|keystore))$/i;

function response(decision, reason) {
  return reason ? { decision, reason } : { decision };
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

export function evaluatePreToolUse(input = {}) {
  const name = input?.toolCall?.name;
  const args = input?.toolCall?.args;
  if (typeof name !== 'string') return response('deny', 'Pre-tool guard received a malformed call; blocked by default.');
  if (/^run_command$/i.test(name)) return response('force_ask', 'Shell commands require fresh owner review before execution.');
  if (readOnlyTool.test(name)) return response('allow');
  if (!mutatingTool.test(name)) return response('force_ask', 'Unclassified Antigravity tool requires owner review.');
  const rawPaths = collectPaths(args);
  const workspaces = (Array.isArray(input.workspacePaths) ? input.workspacePaths : [input.workspacePaths]).filter((item) => typeof item === 'string');
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
  return response('force_ask', 'Native IDE writes are outside the managed executor; review each in-workspace mutation before it runs.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  let result;
  try { result = evaluatePreToolUse(JSON.parse(input)); }
  catch { result = response('deny', 'Pre-tool guard could not parse its input; blocked by default.'); }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
