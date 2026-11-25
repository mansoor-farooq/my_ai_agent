#!/usr/bin/env node
import crypto from 'node:crypto';
import path from 'node:path';

const MANIFEST_SCHEMA = 'mansoor.action-manifest/v1';
const RECEIPT_SCHEMA = 'mansoor.approval-receipt/v1';
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(canonicalize(value));
}

function hash(value) {
  const bytes = typeof value === 'string' || Buffer.isBuffer(value) ? value : stableJson(value);
  return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
}

function normalizeRelativePath(value, code = 'invalid-action-path') {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0')) fail(code);
  const normalized = value.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized) || normalized.startsWith('//')) fail(code);
  const parts = normalized.split('/').filter((part) => part && part !== '.');
  if (!parts.length || parts.some((part) => part === '..')) fail(code);
  return parts.join('/');
}

function normalizeScopePattern(value) {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0')) fail('invalid-action-scope');
  const normalized = value.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized) || normalized.startsWith('//')) fail('invalid-action-scope');
  const parts = normalized.split('/').filter((part) => part && part !== '.');
  if (!parts.length || parts.some((part) => part === '..')) fail('invalid-action-scope');
  return parts.join('/');
}

function matchesPattern(relativePath, pattern) {
  const fileParts = relativePath.toLowerCase().split('/');
  const patternParts = pattern.toLowerCase().split('/');
  const matchFrom = (fileIndex, patternIndex) => {
    if (patternIndex === patternParts.length) return fileIndex === fileParts.length;
    if (patternParts[patternIndex] === '**') {
      for (let next = fileIndex; next <= fileParts.length; next += 1) {
        if (matchFrom(next, patternIndex + 1)) return true;
      }
      return false;
    }
    if (fileIndex >= fileParts.length) return false;
    const segmentPattern = `^${patternParts[patternIndex].replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replaceAll('*', '.*')}$`;
    return new RegExp(segmentPattern, 'i').test(fileParts[fileIndex]) && matchFrom(fileIndex + 1, patternIndex + 1);
  };
  return matchFrom(0, 0);
}

function forbiddenPatterns(task) {
  const value = task.forbiddenPaths ?? task.forbidden_paths ?? [];
  if (typeof value === 'string') return [normalizeScopePattern(value)];
  if (!Array.isArray(value)) fail('invalid-action-forbidden-paths');
  return value.map((item) => normalizeScopePattern(String(item)));
}

function validateWritePath(relativePath, task, plan) {
  const segments = relativePath.toLowerCase().split('/');
  const basename = segments.at(-1) || '';
  const forbidden = forbiddenPatterns(task);
  if (segments.some((segment) => segment.startsWith('.env') || segment === '.git' || segment === 'requirements')
    || /\.(pem|key|p12|pfx)$/i.test(basename)
    || ['id_rsa', 'id_ed25519'].includes(basename)) fail('action-manifest-protected-path');
  if (forbidden.some((pattern) => matchesPattern(relativePath, pattern))) fail('action-manifest-forbidden-path');
  const taskScope = task.scope.map((item) => normalizeScopePattern(String(item)));
  if (!taskScope.some((pattern) => matchesPattern(relativePath, pattern))) fail('action-manifest-outside-task-scope');
  const planScope = plan.affectedPaths.map((item) => normalizeScopePattern(String(item)));
  if (!planScope.some((pattern) => matchesPattern(relativePath, pattern))) fail('action-manifest-outside-plan-scope');
}

function normalizeCommand(check, projectRoot) {
  if (!check || typeof check.id !== 'string' || !check.id.trim() || typeof check.tool !== 'string' || !check.tool.trim() || !Array.isArray(check.args)) {
    fail('invalid-action-check');
  }
  if (!check.args.every((arg) => typeof arg === 'string')) fail('invalid-action-check-arguments');
  const cwdInput = String(check.cwd || '.');
  const cwd = path.resolve(projectRoot, cwdInput);
  const relative = path.relative(projectRoot, cwd);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) fail('action-check-cwd-outside-project');
  const env = check.env && typeof check.env === 'object' && !Array.isArray(check.env) ? check.env : {};
  const envKeys = Object.keys(env).sort();
  return {
    id: check.id,
    tool: check.tool,
    args: [...check.args],
    cwd,
    timeoutMs: Number.isFinite(check.timeoutMs) ? check.timeoutMs : null,
    required: check.required !== false,
    parser: typeof check.parser === 'string' ? check.parser : 'exit-code',
    envKeys,
    envHash: hash(env),
  };
}

function manifestPayload(manifest) {
  const { manifestHash, ...payload } = manifest;
  return payload;
}

function manifestIsValid(manifest) {
  const createdMs = new Date(manifest?.createdAt).getTime();
  const expiresMs = new Date(manifest?.expiresAt).getTime();
  return Boolean(manifest?.schema === MANIFEST_SCHEMA
    && manifest.manifestHash === hash(manifestPayload(manifest))
    && typeof manifest.nonce === 'string'
    && manifest.nonce.trim().length > 0
    && manifest.nonce.length <= 128
    && Number.isFinite(createdMs)
    && Number.isFinite(expiresMs)
    && expiresMs > createdMs);
}

export function createActionManifest(input = {}, { now = new Date(), ttlMs = DEFAULT_TTL_MS, nonce = crypto.randomUUID() } = {}) {
  const task = input.task || {};
  const plan = input.plan || {};
  const workspace = input.workspace || {};
  const policy = input.policy || {};
  if (!String(task.projectId || '').trim() || !String(task.taskId || '').trim() || !String(task.objective || '').trim()) fail('action-manifest-task-identity-required');
  if (!String(task.projectDir || '').trim() || !String(workspace.workspaceId || '').trim() || !String(workspace.baseRevision || '').trim()) fail('action-manifest-workspace-identity-required');
  if (!Array.isArray(task.scope) || !task.scope.length || !Array.isArray(task.acceptance) || !task.acceptance.length) fail('action-manifest-task-contract-required');
  if (!Array.isArray(plan.affectedPaths) || !plan.affectedPaths.length || !Array.isArray(plan.checks)) fail('action-manifest-plan-required');
  if (!plan.checks.some((check) => check?.required !== false)) fail('action-manifest-required-checks-missing');
  if (!Array.isArray(input.actions || [])) fail('action-manifest-actions-invalid');
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1000 || ttlMs > 30 * 60 * 1000) fail('action-manifest-ttl-invalid');
  if (typeof nonce !== 'string' || !nonce.trim() || nonce.length > 128) fail('action-manifest-nonce-invalid');

  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(new Date(createdAt).getTime() + ttlMs).toISOString();
  const projectRoot = path.resolve(task.projectDir);
  const actionIdentity = (action, index, attempt = 1) => {
    if (action?.type !== 'write' || typeof action.content !== 'string') fail('unsupported-or-invalid-action');
    const relativePath = normalizeRelativePath(action.path);
    validateWritePath(relativePath, task, plan);
    const idempotencyKey = `effect-${hash({ projectId: String(task.projectId), taskId: String(task.taskId), nonce: String(nonce), attempt, index, type: 'write', path: relativePath }).slice(7)}`;
    const content = Buffer.from(action.content, 'utf8');
    return { index, attempt, idempotencyKey, type: 'write', path: relativePath, contentHash: hash(content), byteLength: content.byteLength };
  };
  const actions = [...(input.actions || [])].map((action, index) => {
    return actionIdentity(action, index, 1);
  });
  const repairActions = Object.entries(input.repairActions || {})
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([attempt, batch]) => {
      if (!Array.isArray(batch)) fail('action-manifest-repair-actions-invalid');
      return {
        attempt: Number(attempt),
        actions: batch.map((action, index) => actionIdentity(action, index, Number(attempt))),
      };
    });

  if (plan.allowedNetwork !== undefined && !Array.isArray(plan.allowedNetwork)) fail('invalid-action-network-policy');
  const allowedNetwork = [...new Set((plan.allowedNetwork || []).map((item) => String(item).trim()).filter(Boolean))].sort();
  const payload = {
    schema: MANIFEST_SCHEMA,
    createdAt,
    expiresAt,
    nonce: String(nonce),
    project: {
      projectId: String(task.projectId),
      taskId: String(task.taskId),
      projectRoot,
      objective: String(task.objective),
      agent: String(task.agent || ''),
      projectType: String(task.projectType || ''),
      taskType: String(task.taskType || ''),
      taskScope: task.scope.map((item) => normalizeScopePattern(String(item))),
      forbiddenPaths: forbiddenPatterns(task).sort(),
      acceptance: task.acceptance.map(String),
    },
    workspace: {
      workspaceId: String(workspace.workspaceId),
      repoRoot: path.resolve(String(workspace.repoRoot || projectRoot)),
      workspaceDir: path.resolve(String(workspace.workspaceDir || projectRoot)),
      baseRevision: String(workspace.baseRevision),
    },
    plan: {
      affectedPaths: plan.affectedPaths.map((item) => normalizeRelativePath(String(item))).sort(),
      steps: (Array.isArray(plan.steps) ? plan.steps : []).map(String),
      assumptions: (Array.isArray(plan.assumptions) ? plan.assumptions : []).map(String),
      rollback: plan.rollback == null ? null : String(plan.rollback),
    },
    actions,
    repairActions,
    checks: plan.checks.map((check) => normalizeCommand(check, projectRoot)),
    allowedNetwork,
    policy: {
      version: String(policy.version || 'mansoor-managed-policy/v1'),
      registryHash: String(policy.registryHash || 'unavailable'),
      ruleIds: [...new Set((Array.isArray(policy.ruleIds) ? policy.ruleIds : []).map(String))].sort(),
    },
  };
  return { ...payload, manifestHash: hash(payload) };
}

export function createApprovalAuthority({ secret = crypto.randomBytes(32) } = {}) {
  const key = Buffer.isBuffer(secret) ? Buffer.from(secret) : Buffer.from(String(secret));
  if (key.length < 32) fail('approval-authority-secret-too-short');
  const consumed = new Set();

  function signature(payload) {
    return crypto.createHmac('sha256', key).update(stableJson(payload)).digest('base64url');
  }

  function receiptPayload(receipt) {
    const { signature: omitted, ...payload } = receipt;
    return payload;
  }

  function verify(receipt, manifest, { now = new Date() } = {}) {
    if (!manifestIsValid(manifest)) return { valid: false, reason: 'action-manifest-invalid' };
    if (!receipt || receipt.schema !== RECEIPT_SCHEMA || !receipt.receiptId) return { valid: false, reason: 'approval-receipt-invalid' };
    if (receipt.manifestHash !== manifest.manifestHash || receipt.nonce !== manifest.nonce) return { valid: false, reason: 'approval-receipt-manifest-mismatch' };
    if (receipt.decision !== 'approve' || !String(receipt.actor || '').trim() || !String(receipt.source || '').trim()) return { valid: false, reason: 'approval-receipt-decision-invalid' };
    const nowMs = new Date(now).getTime();
    const issuedAtMs = new Date(receipt.issuedAt).getTime();
    const expiryMs = new Date(receipt.expiresAt).getTime();
    const manifestCreatedMs = new Date(manifest.createdAt).getTime();
    const manifestExpiryMs = new Date(manifest.expiresAt).getTime();
    if (!Number.isFinite(nowMs) || !Number.isFinite(issuedAtMs) || !Number.isFinite(expiryMs)
      || issuedAtMs < manifestCreatedMs || issuedAtMs >= expiryMs || expiryMs > manifestExpiryMs
      || nowMs < issuedAtMs || nowMs >= expiryMs) return { valid: false, reason: 'approval-receipt-expired' };
    const expected = Buffer.from(signature(receiptPayload(receipt)));
    const actual = Buffer.from(String(receipt.signature || ''));
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return { valid: false, reason: 'approval-receipt-signature-invalid' };
    return { valid: true, receiptId: receipt.receiptId, manifestHash: receipt.manifestHash };
  }

  return Object.freeze({
    issue(manifest, decision = {}) {
      if (!manifestIsValid(manifest)) fail('action-manifest-invalid');
      if (decision.approved !== true) fail('approval-required');
      if (decision.manifestHash && decision.manifestHash !== manifest.manifestHash) fail('approval-manifest-mismatch');
      if (decision.nonce && decision.nonce !== manifest.nonce) fail('approval-nonce-mismatch');
      if (!String(decision.actor || '').trim() || !String(decision.source || '').trim()) fail('approval-provenance-required');
      const issuedAt = new Date(decision.issuedAt || new Date()).toISOString();
      const issuedAtMs = new Date(issuedAt).getTime();
      if (issuedAtMs < new Date(manifest.createdAt).getTime() || issuedAtMs >= new Date(manifest.expiresAt).getTime()) fail('action-manifest-expired');
      const payload = {
        schema: RECEIPT_SCHEMA,
        receiptId: `APR-${crypto.randomUUID()}`,
        decision: 'approve',
        manifestHash: manifest.manifestHash,
        nonce: manifest.nonce,
        actor: String(decision.actor),
        source: String(decision.source),
        issuedAt,
        expiresAt: manifest.expiresAt,
      };
      return { ...payload, signature: signature(payload) };
    },
    verify,
    consume(receipt, manifest, options = {}) {
      const result = verify(receipt, manifest, options);
      if (!result.valid) return result;
      if (consumed.has(receipt.receiptId)) return { valid: false, reason: 'approval-receipt-replayed' };
      consumed.add(receipt.receiptId);
      return result;
    },
  });
}

export function validateActionManifest(manifest) {
  return manifestIsValid(manifest);
}

export function canonicalHash(value) {
  return hash(value);
}

export { MANIFEST_SCHEMA, RECEIPT_SCHEMA };
