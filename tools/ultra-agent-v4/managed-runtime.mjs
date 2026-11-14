#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCoreLoop } from './core-loop.mjs';
import { createEffectKey, EffectLedger, claimEffect, completeEffect } from './effects.mjs';
import { guardWritePath } from './stages/act.mjs';
import { runChecks } from './stages/verify.mjs';
import { resolveRules, validateRuleRegistry } from '../rule-governance.mjs';
import { startTrace, recordSpan, finishTrace, redactTrace } from '../ultra-agent-v3/trace.mjs';
import { inspectTaskWorkspace, createOrResumeTaskWorkspace, prepareTaskWorkspaceReview, promoteTaskWorkspace, discardTaskWorkspace } from './task-workspaces.mjs';
import { createActionManifest, validateActionManifest } from '../ultra-agent-v5/action-manifest.mjs';
import { DurableActionLedger, createFileBackedApprovalAuthority } from '../ultra-agent-v5/durable-ledger.mjs';

const HUB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_REGISTRY_PATH = path.join(HUB_ROOT, 'shared', 'control-plane', 'rule-registry.json');
const SAFE_CHECK_TOOLS = new Set(['node', 'npm', 'npx', 'flutter', 'dart', 'dotnet', 'python', 'python3', 'pytest', 'git']);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function jsonHash(value) {
  const normalize = (item) => Array.isArray(item)
    ? item.map(normalize)
    : item && typeof item === 'object'
      ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, normalize(item[key])]))
      : item;
  return `sha256:${sha256(JSON.stringify(normalize(value)))}`;
}

function safeTaskId(value) {
  const id = String(value || '');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(id)) throw new Error('taskId must be a safe identifier');
  return id;
}

function blocked(reason, extras = {}) {
  return { schema: 'mansoor.managed-run/v1', status: 'blocked', lifecycle: 'ESCALATED', blockers: [reason], changes: [], evidence: [], ...extras };
}

function within(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function ensureRuntimeDirectory(projectDir, relativePath) {
  const root = path.resolve(projectDir);
  const target = path.resolve(root, relativePath);
  if (!within(root, target)) throw Object.assign(new Error('runtime-state-outside-project'), { code: 'runtime-state-outside-project' });
  let current = root;
  for (const part of path.relative(root, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink()) throw Object.assign(new Error('runtime-state-symlink-path'), { code: 'runtime-state-symlink-path' });
      if (!stat.isDirectory()) throw Object.assign(new Error('runtime-state-path-not-directory'), { code: 'runtime-state-path-not-directory' });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      fs.mkdirSync(current);
    }
  }
  if (!within(fs.realpathSync(root), fs.realpathSync(target))) throw Object.assign(new Error('runtime-state-symlink-escape'), { code: 'runtime-state-symlink-escape' });
  return target;
}

function validateCheckRegistry(checks, projectDir) {
  if (!Array.isArray(checks) || !checks.length) return { ok: false, reason: 'required-check-registry-empty' };
  for (const check of checks) {
    if (!check?.id || !check?.tool || !Array.isArray(check.args)) return { ok: false, reason: 'malformed-check-registry' };
    const tool = String(check.tool);
    const toolBase = path.basename(tool).toLowerCase().replace(/\.exe$/, '');
    const trustedResolvedNode = path.isAbsolute(tool) && path.resolve(tool).toLowerCase() === path.resolve(process.execPath).toLowerCase();
    if (!SAFE_CHECK_TOOLS.has(toolBase) && !trustedResolvedNode) return { ok: false, reason: 'unregistered-check-tool' };
    const cwd = path.resolve(projectDir, check.cwd || '.');
    if (!within(projectDir, cwd)) return { ok: false, reason: 'check-cwd-outside-project' };
    let current = projectDir;
    for (const part of path.relative(projectDir, cwd).split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      if (!fs.existsSync(current)) continue;
      try {
        if (fs.lstatSync(current).isSymbolicLink()) return { ok: false, reason: 'check-cwd-symlink' };
      } catch { return { ok: false, reason: 'check-cwd-inspection-failed' }; }
    }
  }
  return { ok: true };
}

function normalizePlanChecks(checks, projectRoot) {
  return (Array.isArray(checks) ? checks : []).map((check) => {
    const cwd = String(check.cwd || '.');
    if (!path.isAbsolute(cwd)) return { ...check, cwd };
    const absolute = path.resolve(cwd);
    return within(projectRoot, absolute)
      ? { ...check, cwd: path.relative(projectRoot, absolute) || '.' }
      : { ...check, cwd };
  });
}

export async function createManagedPolicy({ task, plan, approval, ruleRegistry, hubRoot = HUB_ROOT } = {}) {
  if (approval?.approved !== true || !String(approval.actor || '').trim()) return { ok: false, reason: 'owner-plan-approval-required' };
  if (!task?.projectId || !task?.taskId || !task?.projectDir) return { ok: false, reason: 'task-identity-required' };
  if (!Array.isArray(plan?.affectedPaths) || !plan.affectedPaths.length) return { ok: false, reason: 'approved-plan-paths-required' };
  const loadedRegistry = ruleRegistry || JSON.parse(fs.readFileSync(path.join(hubRoot, 'shared', 'control-plane', 'rule-registry.json'), 'utf8'));
  const registryReport = await validateRuleRegistry(loadedRegistry, { root: hubRoot });
  if (!registryReport.valid) return { ok: false, reason: 'rule-registry-invalid', errors: [...registryReport.errors, ...registryReport.hashMismatches] };
  const rules = resolveRules(loadedRegistry, { projectType: task.projectType || '', agent: task.agent || 'production-orchestrator', taskType: task.taskType || 'implementation' });
  const checkReport = validateCheckRegistry(plan.checks, task.projectDir);
  if (!checkReport.ok) return { ok: false, reason: checkReport.reason };
  return {
    ok: true,
    task: { ...task, taskId: safeTaskId(task.taskId), projectDir: path.resolve(task.projectDir) },
    plan: { ...plan, affectedPaths: plan.affectedPaths.map(String) },
    approval: { actor: redactTrace(approval.actor), approvedAt: approval.approvedAt || new Date().toISOString(), planHash: jsonHash(plan) },
    ruleIds: rules.map((rule) => rule.id),
    requiredEvidence: [...new Set([...(task.requiredEvidence || []).map(String), ...rules.flatMap((rule) => rule.requiredEvidence || []).map(String)])],
  };
}

export function authorizeManagedAction(policy, action = {}) {
  if (!policy?.ok) return { allowed: false, code: 'invalid-managed-policy' };
  if (String(action.type || 'write').toLowerCase() !== 'write') return { allowed: false, code: 'unsupported-managed-action' };
  const requestedPath = String(action.path || '');
  const taskDecision = guardWritePath(policy.task, requestedPath);
  if (!taskDecision.allowed) return { ...taskDecision, allowed: false };
  const planDecision = guardWritePath({ ...policy.task, scope: policy.plan.affectedPaths }, taskDecision.path);
  if (!planDecision.allowed) return { ...planDecision, allowed: false, code: 'outside-approved-plan' };
  if (typeof action.content !== 'string') return { allowed: false, path: taskDecision.path, code: 'write-content-must-be-text' };
  return { allowed: true, path: taskDecision.path, code: 'approved-plan-write' };
}

function acquireTaskLock(projectDir, taskId) {
  const lockError = (code) => Object.assign(new Error(code), { code });
  const lockDir = ensureRuntimeDirectory(projectDir, path.join('.agents', 'ultra-v4', 'locks'));
  const lockPath = path.join(lockDir, `${taskId}.lock`);
  const token = crypto.randomUUID();
  const lockRecord = JSON.stringify({ taskId, pid: process.pid, token, acquiredAt: new Date().toISOString() });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let fd;
    try {
      fd = fs.openSync(lockPath, 'wx', 0o600);
      fs.writeFileSync(fd, lockRecord);
      fs.fsyncSync(fd);
      return () => {
        try { fs.closeSync(fd); } catch {}
        try {
          const current = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
          if (current.token === token && current.pid === process.pid) fs.unlinkSync(lockPath);
        } catch {}
      };
    } catch (error) {
      if (fd !== undefined) { try { fs.closeSync(fd); } catch {} }
      if (error.code !== 'EEXIST') throw error;
    }

    let existingText;
    let existingStat;
    let existing;
    try {
      existingText = fs.readFileSync(lockPath, 'utf8');
      existingStat = fs.statSync(lockPath);
      existing = JSON.parse(existingText);
    } catch {
      throw lockError('task-lock-unreadable');
    }
    if (existing.taskId !== taskId || !Number.isSafeInteger(existing.pid) || existing.pid < 1 || typeof existing.token !== 'string') {
      throw lockError('task-lock-unreadable');
    }
    let processExists = true;
    try { process.kill(existing.pid, 0); }
    catch (error) {
      if (error.code === 'ESRCH') processExists = false;
      else if (error.code !== 'EPERM') throw error;
    }
    if (processExists) throw lockError('task-already-running');

    // Recheck the exact lock contents and file identity before removing a stale lock.
    try {
      const currentStat = fs.statSync(lockPath);
      const currentText = fs.readFileSync(lockPath, 'utf8');
      if (currentText !== existingText || currentStat.mtimeMs !== existingStat.mtimeMs || currentStat.size !== existingStat.size) continue;
      fs.unlinkSync(lockPath);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
  }
  throw lockError('task-lock-acquire-race');
}

function appendCheckpoint(filePath, event) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const redact = (value) => Array.isArray(value)
    ? value.map(redact)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)]))
      : typeof value === 'string' ? redactTrace(value) : value;
  const clean = redact({ schemaVersion: 1, ...event });
  const fd = fs.openSync(filePath, 'a', 0o600);
  try { fs.writeSync(fd, `${JSON.stringify(clean)}\n`, null, 'utf8'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
}

function atomicWrite(projectDir, relativePath, content) {
  const target = path.resolve(projectDir, relativePath);
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true });
  const temporary = path.join(parent, `.${path.basename(target)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`);
  const fd = fs.openSync(temporary, 'wx', 0o600);
  try {
    fs.writeFileSync(fd, content, 'utf8');
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  try { fs.renameSync(temporary, target); }
  catch (error) { try { fs.unlinkSync(temporary); } catch {} throw error; }
  return target;
}

function executeManagedWrites(policy, actions, effectLedger, actionLedger, manifestHash, approvalReceiptId, effectCheckpoint) {
  const changedPaths = [];
  const evidence = [];
  let replayedWrites = 0;
  for (const action of actions) {
    const decision = authorizeManagedAction(policy, action);
    if (!decision.allowed) return { scopeViolation: true, violation: decision.code, changedPaths: [], evidence: [], replayedWrites };
    const relativePath = decision.path;
    const bytes = Buffer.from(action.content, 'utf8');
    const contentHash = sha256(bytes);
    const actionId = String(action.idempotencyKey || action.actionId || '');
    if (!actionId) return { scopeViolation: true, violation: 'action-idempotency-key-required', changedPaths: [], evidence: [], replayedWrites };
    const effectKey = actionId;
    const destination = path.resolve(policy.task.projectDir, relativePath);
    if (!within(policy.task.projectDir, destination)) return { scopeViolation: true, violation: 'outside-project-root', changedPaths: [], evidence: [], replayedWrites };
    const currentHash = fs.existsSync(destination) && fs.statSync(destination).isFile() ? sha256(fs.readFileSync(destination)) : null;
    const state = actionLedger.state('effect', effectKey);
    const initialDetails = { manifestHash, path: relativePath, payloadHash: contentHash, beforeHash: currentHash };
    if (!state) actionLedger.transition('effect', effectKey, 'prepared', initialDetails);
    else if (state.details?.payloadHash !== contentHash || state.details?.manifestHash !== manifestHash || state.details?.path !== relativePath) {
      return { scopeViolation: true, violation: 'effect-idempotency-payload-mismatch', changedPaths: [], evidence: [], replayedWrites };
    }
    let effectState = actionLedger.state('effect', effectKey);
    if (effectState.status === 'prepared') {
      actionLedger.transition('effect', effectKey, 'approved', { ...effectState.details, approvalReceiptId });
      effectState = actionLedger.state('effect', effectKey);
    }
    if (effectState.status === 'approved') {
      actionLedger.transition('effect', effectKey, 'executing', { ...effectState.details, approvalReceiptId });
      effectState = actionLedger.state('effect', effectKey);
    }
    if (['reconciled', 'verified', 'promoted'].includes(effectState.status)) {
      if (currentHash !== contentHash) {
        actionLedger.transition('effect', effectKey, 'unknown', { ...effectState.details, observedHash: currentHash, reason: 'target-drift-after-reconciliation' });
        return { scopeViolation: true, violation: 'effect-state-unknown', changedPaths: [], evidence: [], replayedWrites };
      }
      replayedWrites += 1;
      changedPaths.push(relativePath);
      evidence.push(`write:${relativePath}:${contentHash}`);
      continue;
    }
    if (effectState.status !== 'executing') return { scopeViolation: true, violation: `effect-${effectState.status}`, changedPaths: [], evidence: [], replayedWrites };
    const oldInput = { projectId: policy.task.projectId, taskId: policy.task.taskId, action: 'write-file', target: relativePath, payload: contentHash };
    const legacyEffectKey = createEffectKey(oldInput);
    if (currentHash === contentHash) {
      actionLedger.transition('effect', effectKey, 'reconciled', { manifestHash, path: relativePath, payloadHash: contentHash, resultHash: contentHash, recovered: true });
      const previous = effectLedger.get(legacyEffectKey);
      if (previous?.status === 'claimed') completeEffect(legacyEffectKey, { contentHash, replayRecovered: true }, effectLedger);
      replayedWrites += 1;
      changedPaths.push(relativePath);
      evidence.push(`write:${relativePath}:${contentHash}`);
      continue;
    }
    if (currentHash !== effectState.details?.beforeHash) {
      actionLedger.transition('effect', effectKey, 'unknown', { ...effectState.details, observedHash: currentHash, reason: 'preimage-mismatch' });
      return { scopeViolation: true, violation: 'effect-state-unknown', changedPaths: [], evidence: [], replayedWrites };
    }
    if (typeof effectCheckpoint === 'function') effectCheckpoint({ phase: 'before-effect', actionId: effectKey, path: relativePath, payloadHash: contentHash, manifestHash });
    const legacyClaim = claimEffect({ ...oldInput, effectKey: legacyEffectKey }, effectLedger);
    if (!legacyClaim.claimed && legacyClaim.record.status !== 'claimed') {
      return { scopeViolation: true, violation: 'legacy-effect-replay-conflict', changedPaths: [], evidence: [], replayedWrites };
    }
    const targetPath = atomicWrite(policy.task.projectDir, relativePath, action.content);
    const writtenHash = sha256(fs.readFileSync(targetPath));
    if (typeof effectCheckpoint === 'function') effectCheckpoint({ phase: 'after-effect', actionId: effectKey, path: relativePath, payloadHash: contentHash, resultHash: writtenHash, manifestHash });
    if (writtenHash !== contentHash) {
      actionLedger.transition('effect', effectKey, 'unknown', { ...effectState.details, observedHash: writtenHash, reason: 'write-hash-mismatch' });
      return { scopeViolation: true, violation: 'write-hash-mismatch', changedPaths: [], evidence: [], replayedWrites };
    }
    if (legacyClaim.claimed) completeEffect(legacyEffectKey, { contentHash }, effectLedger);
    actionLedger.transition('effect', effectKey, 'reconciled', { manifestHash, path: relativePath, payloadHash: contentHash, resultHash: writtenHash });
    changedPaths.push(relativePath);
    evidence.push(`write:${relativePath}:${contentHash}`);
  }
  return { scopeViolation: false, changedPaths, evidence, replayedWrites };
}

export async function runManagedTask(input = {}, deps = {}) {
  let releaseLock;
  let trace;
  let checkpointFile;
  let policy;
  let workspace;
  let projectRoot;
  let actionManifest;
  let approvalReceipt;
  let actionLedger;
  let ledgerRunId;
  try {
    if (typeof deps.approvePlan !== 'function' && typeof deps.approvalAuthorityFactory !== 'function') return blocked('host-approval-adapter-required');
    if (typeof deps.approvalAuthority?.verify !== 'function' && typeof deps.approvalAuthorityFactory !== 'function') return blocked('approval-authority-required');
    if (input.actionManifest === undefined) return blocked('action-manifest-required');
    const taskId = safeTaskId(input.task?.taskId);
    projectRoot = path.resolve(String(input.task?.projectDir || ''));
    if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) return blocked('project-directory-required');
    const plan = { ...(input.plan || {}) };
    const identity = { projectId: String(input.task?.projectId || ''), taskId };
    const workspaceInspection = inspectTaskWorkspace({ projectDir: projectRoot, ...identity, workspaceRoot: deps.workspaceRoot });
    if (!workspaceInspection.ok) return blocked(workspaceInspection.reason || 'workspace-inspection-failed');
    releaseLock = acquireTaskLock(projectRoot, taskId);
    const ruleRegistry = deps.ruleRegistry || JSON.parse(fs.readFileSync(path.join(deps.hubRoot || HUB_ROOT, 'shared', 'control-plane', 'rule-registry.json'), 'utf8'));
    const manifestInput = {
      task: input.task,
      plan,
      actions: input.actions || [],
      repairActions: input.repairActions || {},
      workspace: workspaceInspection,
      policy: {
        version: `rule-registry/${ruleRegistry.schemaVersion || 1}`,
        registryHash: jsonHash(ruleRegistry),
        ruleIds: (ruleRegistry.rules || []).map((rule) => rule.id),
      },
    };
    if (!validateActionManifest(input.actionManifest)) return blocked('action-manifest-invalid');
    const createdMs = new Date(input.actionManifest.createdAt).getTime();
    const expiryMs = new Date(input.actionManifest.expiresAt).getTime();
    const ttlMs = expiryMs - createdMs;
    if (!Number.isFinite(createdMs) || !Number.isFinite(expiryMs) || !Number.isSafeInteger(ttlMs)) return blocked('action-manifest-expired');
    const manifestOptions = { now: new Date(createdMs), ttlMs, nonce: input.actionManifest.nonce };
    actionManifest = createActionManifest(manifestInput, manifestOptions);
    if (input.actionManifest.manifestHash !== actionManifest.manifestHash) {
      return blocked('action-manifest-mismatch', { expectedManifestHash: actionManifest.manifestHash, providedManifestHash: input.actionManifest.manifestHash });
    }
    const volatileManifestFields = new Set(['createdAt', 'expiresAt', 'nonce', 'manifestHash']);
    const stableManifest = Object.fromEntries(Object.entries(actionManifest).filter(([key]) => !volatileManifestFields.has(key)));
    const approvalPlanHash = jsonHash(stableManifest);
    const runDir = ensureRuntimeDirectory(projectRoot, path.join('.agents', 'ultra-v4', 'managed-runs', taskId));
    const nowProvider = typeof deps.now === 'function' ? deps.now : () => deps.now || new Date();
    actionLedger = new DurableActionLedger({ directory: runDir, projectId: identity.projectId, taskId, now: nowProvider });
    ledgerRunId = actionManifest.nonce;
    let existingRun = actionLedger.state('run', ledgerRunId);
    if (!existingRun) {
      actionLedger.transition('run', ledgerRunId, 'prepared', { manifestHash: actionManifest.manifestHash, policyHash: actionManifest.policy.registryHash });
      existingRun = actionLedger.state('run', ledgerRunId);
    }
    else if (existingRun.details?.manifestHash !== actionManifest.manifestHash) return blocked('action-ledger-manifest-mismatch', { actionManifestHash: actionManifest.manifestHash });
    else if (['rejected', 'expired', 'blocked', 'unknown', 'promoted', 'discarded'].includes(existingRun.status)) return blocked(`action-ledger-run-${existingRun.status}`, { actionManifestHash: actionManifest.manifestHash });
    const existingApproval = actionLedger.findApproval(actionManifest.nonce);
    const authority = typeof deps.approvalAuthorityFactory === 'function'
      ? await deps.approvalAuthorityFactory(actionManifest, actionLedger)
      : deps.approvalAuthority;
    if (typeof authority?.verify !== 'function') return blocked('approval-authority-required');
    if (!existingApproval) {
      if (existingRun.status === 'prepared') actionLedger.transition('run', ledgerRunId, 'awaiting_approval', { manifestHash: actionManifest.manifestHash });
      const approvalState = actionLedger.state('approval', actionManifest.nonce);
      if (!approvalState) actionLedger.transition('approval', actionManifest.nonce, 'awaiting_approval', { manifestHash: actionManifest.manifestHash });
      if (typeof deps.approvePlan !== 'function') return blocked('host-approval-adapter-required');
      try { approvalReceipt = await deps.approvePlan(actionManifest, authority); }
      catch (error) {
        actionLedger.transition('approval', actionManifest.nonce, 'rejected', { manifestHash: actionManifest.manifestHash, reason: error.code || 'host-approval-failed' });
        actionLedger.transition('run', ledgerRunId, 'rejected', { manifestHash: actionManifest.manifestHash, reason: error.code || 'host-approval-failed' });
        return blocked('host-approval-rejected', { actionManifestHash: actionManifest.manifestHash });
      }
    } else approvalReceipt = existingApproval.receipt;
    const receiptStatus = actionLedger.consumeApproval(approvalReceipt, actionManifest, authority, { now: deps.now || new Date() });
    if (!receiptStatus.valid) {
      const reason = receiptStatus.reason === 'approval-receipt-expired' ? 'expired' : 'blocked';
      const approvalState = actionLedger.state('approval', actionManifest.nonce);
      if (reason === 'expired' && approvalState?.status === 'awaiting_approval') actionLedger.transition('approval', actionManifest.nonce, 'expired', { manifestHash: actionManifest.manifestHash });
      return blocked(`approval-${receiptStatus.reason}`, { actionManifestHash: actionManifest.manifestHash });
    }
    let runState = actionLedger.state('run', ledgerRunId);
    if (runState?.status === 'awaiting_approval') actionLedger.transition('run', ledgerRunId, 'approved', { manifestHash: actionManifest.manifestHash, receiptId: approvalReceipt.receiptId });
    else if (!['approved', 'executing', 'verified', 'review-required'].includes(runState?.status)) return blocked(`action-ledger-run-${runState?.status || 'missing'}`);
    const approvalPayloadHash = approvalPlanHash;
    const approval = {
      approved: true,
      actor: approvalReceipt.actor,
      approvedAt: approvalReceipt.issuedAt,
      planHash: actionManifest.manifestHash,
      receiptId: approvalReceipt.receiptId,
      approvalSource: approvalReceipt.source,
    };
    const forbiddenPaths = input.task.forbiddenPaths || input.task.forbidden_paths || [];
    workspace = createOrResumeTaskWorkspace({
      projectDir: projectRoot,
      ...identity,
      planHash: approvalPayloadHash,
      allowedPaths: plan.affectedPaths || [],
      forbiddenPaths,
      workspaceRoot: deps.workspaceRoot,
      expectedBaseRevision: workspaceInspection.baseRevision,
    });
    const executionTask = { ...input.task, taskId, projectDir: workspace.workspaceDir };
    const executionPlan = { ...plan, checks: normalizePlanChecks(plan.checks, projectRoot) };
    policy = await createManagedPolicy({ task: executionTask, plan: executionPlan, approval, ruleRegistry, hubRoot: deps.hubRoot || HUB_ROOT });
    if (!policy.ok) return blocked(policy.reason, { policyErrors: policy.errors || [] });
    trace = await startTrace({ dir: projectRoot, taskId, projectId: input.task.projectId });
    checkpointFile = path.join(runDir, 'events.jsonl');
    const ledgerPath = path.join(runDir, 'effects.jsonl');
    const effectLedger = deps.effectStore || new EffectLedger(ledgerPath);
    const events = [];
    let replayedWrites = 0;
    const checkpoint = async (event) => {
      const record = { taskId, projectId: input.task.projectId, workspaceId: workspace.workspaceId, baseRevision: workspace.baseRevision, planHash: policy.approval.planHash, actionManifestHash: actionManifest.manifestHash, approvalReceiptId: approvalReceipt.receiptId, traceId: trace.traceId, ...event };
      appendCheckpoint(checkpointFile, record);
      events.push(record);
      await recordSpan(trace, { kind: event.phase || 'checkpoint', name: event.to || event.phase || '', status: 'observed', details: JSON.stringify({ attempt: event.attempt, reason: event.reason, changedPaths: event.changedPaths }) });
      if (typeof deps.checkpoint === 'function') await deps.checkpoint(record);
    };
    const checkRegistry = executionPlan.checks || [];
    runState = actionLedger.state('run', ledgerRunId);
    if (runState?.status === 'approved') actionLedger.transition('run', ledgerRunId, 'executing', { manifestHash: actionManifest.manifestHash, receiptId: approvalReceipt.receiptId });
    const result = await runCoreLoop({
      ...executionTask,
      taskId,
      projectId: input.task.projectId,
      projectDir: workspace.workspaceDir,
      requiredEvidence: policy.requiredEvidence,
    }, {
      planInput: { ...executionPlan, approved: true },
      checkRegistry,
      actionProvider: async ({ attempt }) => {
        const batch = attempt === 1 ? (input.actions || []) : (input.repairActions?.[attempt] || []);
        const manifestBatch = attempt === 1 ? actionManifest.actions : actionManifest.repairActions.find((entry) => entry.attempt === attempt)?.actions || [];
        return batch.map((action, index) => ({ ...action, idempotencyKey: manifestBatch[index]?.idempotencyKey }));
      },
      checkpoint,
      stopSignal: deps.stopSignal,
      runChecks: async (checks, changes, options) => {
        const result = await (deps.runChecks || runChecks)(checks, changes, options);
        const evidence = (result.checks || []).filter((item) => item.status === 'pass').map((item) => `check:${item.id}`);
        return { ...result, evidence };
      },
      executeAction: async ({ act }) => {
        const result = executeManagedWrites(policy, act.allowedActions || [], effectLedger, actionLedger, actionManifest.manifestHash, approvalReceipt.receiptId, deps.effectCheckpoint);
        replayedWrites += result.replayedWrites || 0;
        await recordSpan(trace, { kind: 'managed-action', status: result.scopeViolation ? 'blocked' : 'completed', details: JSON.stringify({ changedPaths: result.changedPaths, replayedWrites: result.replayedWrites, violation: result.violation }) });
        return result;
      },
      repairAction: deps.repairAction,
      verifiedFacts: input.verifiedFacts || [],
      sourceRefs: input.sourceRefs || [],
    });
    const checkEvidence = (result.verification?.checks || []).filter((item) => item.status === 'pass').map((item) => `check:${item.id}`);
    const evidence = [...new Set([...(result.evidence || []), ...checkEvidence])];
    if (Array.isArray(input.repositoryFindings) && input.repositoryFindings.length) evidence.push('repository-findings');
    if (Array.isArray(plan.affectedPaths) && plan.affectedPaths.length) evidence.push('affected-paths');
    if (result.verification?.allPassed === true) evidence.push('verification-results');
    if (result.verification?.allPassed === true) {
      for (const event of actionLedger.events().filter((entry) => entry.subjectType === 'effect' && entry.to === 'reconciled' && entry.details?.manifestHash === actionManifest.manifestHash)) {
        actionLedger.transition('effect', event.subjectId, 'verified', { manifestHash: actionManifest.manifestHash, path: event.details.path, payloadHash: event.details.payloadHash, verificationHash: jsonHash(result.verification) });
      }
      const current = actionLedger.state('run', ledgerRunId);
      if (current?.status === 'executing') actionLedger.transition('run', ledgerRunId, 'verified', { manifestHash: actionManifest.manifestHash, verificationHash: jsonHash(result.verification) });
    } else {
      const current = actionLedger.state('run', ledgerRunId);
      if (current?.status === 'executing' && result.scopeViolation) actionLedger.transition('run', ledgerRunId, 'blocked', { manifestHash: actionManifest.manifestHash, reason: 'scope-violation' });
    }
    const missingEvidence = policy.requiredEvidence.filter((required) => !evidence.some((item) => item === required || item.startsWith(`${required}:`)));
    let delivery = { status: 'in-progress', workspaceId: workspace.workspaceId, baseRevision: workspace.baseRevision, workspaceDir: workspace.workspaceDir };
    if (result.status === 'complete') {
      const review = prepareTaskWorkspaceReview(workspace);
      workspace = review;
      delivery = {
        status: review.status,
        workspaceId: review.workspaceId,
        baseRevision: review.baseRevision,
        workspaceDir: review.workspaceDir,
        changedPaths: review.changedPaths,
        patchPath: review.patchPath,
        patchHash: review.patchHash,
        nextAction: review.status === 'review-required' ? 'inspect-patch-and-explicitly-promote' : null,
      };
      const current = actionLedger.state('run', ledgerRunId);
      if (current?.status === 'verified') actionLedger.transition('run', ledgerRunId, 'review-required', { manifestHash: actionManifest.manifestHash, workspaceId: workspace.workspaceId, patchHash: review.patchHash || null, changedPaths: review.changedPaths || [] });
    }
    let final = {
      ...result,
      evidence: [...new Set(evidence)],
      policy: { ruleIds: policy.ruleIds },
      approval: { receiptId: approvalReceipt.receiptId, source: approvalReceipt.source, issuedAt: approvalReceipt.issuedAt, expiresAt: approvalReceipt.expiresAt, manifestHash: actionManifest.manifestHash },
      traceId: trace.traceId,
      tracePath: trace.path,
      checkpointPath: checkpointFile,
      replayedWrites,
      workspace,
      delivery,
    };
    if (result.status === 'complete' && missingEvidence.length) final = { ...final, status: 'unverified', blockers: [...(final.blockers || []), ...missingEvidence.map((item) => `required-evidence-missing:${item}`)], nextAction: 'collect-required-evidence' };
    await finishTrace(trace, { status: final.status, details: JSON.stringify({ taskId, workspaceId: workspace.workspaceId, deliveryStatus: delivery.status, changedPaths: delivery.changedPaths || final.changes, blockers: final.blockers }) });
    return final;
  } catch (error) {
    if (trace) {
      try { await recordSpan(trace, { kind: 'managed-runtime-error', status: 'blocked', details: error.message }); await finishTrace(trace, { status: 'blocked', details: error.message }); } catch {}
    }
    const reason = error.code || (error.message === 'task-already-running' ? error.message : 'managed-runtime-failed');
    return blocked(reason, { error: redactTrace(error.message), actionManifestHash: actionManifest?.manifestHash || null, traceId: trace?.traceId || null, tracePath: trace?.path || null, workspace: workspace || null });
  } finally {
    releaseLock?.();
  }
}

export function promoteManagedTaskWorkspace(workspaceInput, approval = {}) {
  const projectRoot = path.resolve(String(workspaceInput?.repoRoot || ''));
  const taskId = safeTaskId(workspaceInput?.taskId);
  if (!projectRoot || !fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) return blocked('project-directory-required');
  let releaseLock;
  try {
    releaseLock = acquireTaskLock(projectRoot, taskId);
    const ledgerDir = ensureRuntimeDirectory(projectRoot, path.join('.agents', 'ultra-v4', 'managed-runs', taskId));
    const actionLedger = new DurableActionLedger({ directory: ledgerDir, projectId: String(workspaceInput?.projectId || '') , taskId });
    const matchingRuns = actionLedger.events().filter((event) => event.subjectType === 'run'
      && ['review-required', 'promoted'].includes(event.to)
      && event.details?.workspaceId === workspaceInput.workspaceId
      && event.details?.patchHash === workspaceInput.patchHash);
    const runEvent = matchingRuns.at(-1);
    if (!runEvent) return blocked('promotion-action-ledger-record-missing');
    const promoted = promoteTaskWorkspace(workspaceInput, approval);
    const runState = actionLedger.state('run', runEvent.subjectId);
    const promotionDetails = { manifestHash: runState?.details?.manifestHash || runEvent.details.manifestHash, patchHash: promoted.patchHash, changedPaths: [...(promoted.changedPaths || [])] };
    if (runState?.status === 'review-required') actionLedger.transition('run', runEvent.subjectId, 'promoted', promotionDetails);
    for (const event of actionLedger.events().filter((entry) => entry.subjectType === 'effect'
      && entry.to === 'verified' && entry.details?.manifestHash === promotionDetails.manifestHash)) {
      actionLedger.transition('effect', event.subjectId, 'promoted', { manifestHash: promotionDetails.manifestHash, path: event.details.path, payloadHash: event.details.payloadHash, patchHash: promoted.patchHash });
    }
    return { schema: 'mansoor.managed-promotion/v1', ...promoted, audit: { approvalSource: 'antigravity-host-invocation-unattested', actionManifestHash: promotionDetails.manifestHash } };
  } catch (error) {
    return blocked(error.code || 'managed-promotion-failed', { error: redactTrace(error.message) });
  } finally { releaseLock?.(); }
}

export function discardManagedTaskWorkspace(workspaceInput, approval = {}) {
  const projectRoot = path.resolve(String(workspaceInput?.repoRoot || ''));
  const taskId = safeTaskId(workspaceInput?.taskId);
  if (!projectRoot || !fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) return blocked('project-directory-required');
  let releaseLock;
  try {
    releaseLock = acquireTaskLock(projectRoot, taskId);
    const ledgerDir = ensureRuntimeDirectory(projectRoot, path.join('.agents', 'ultra-v4', 'managed-runs', taskId));
    const actionLedger = new DurableActionLedger({ directory: ledgerDir, projectId: String(workspaceInput?.projectId || ''), taskId });
    const matchingRun = actionLedger.events().filter((event) => event.subjectType === 'run'
      && event.to === 'review-required' && event.details?.workspaceId === workspaceInput.workspaceId).at(-1);
    if (!matchingRun) return blocked('discard-action-ledger-record-missing');
    const discarded = discardTaskWorkspace(workspaceInput, approval);
    const current = actionLedger.state('run', matchingRun.subjectId);
    if (current?.status === 'review-required') actionLedger.transition('run', matchingRun.subjectId, 'discarded', { manifestHash: current.details.manifestHash, workspaceId: workspaceInput.workspaceId });
    return { schema: 'mansoor.managed-discard/v1', ...discarded, audit: { approvalSource: 'antigravity-host-invocation-unattested', actionManifestHash: current?.details?.manifestHash || null } };
  } catch (error) {
    return blocked(error.code || 'managed-discard-failed', { error: redactTrace(error.message) });
  } finally { releaseLock?.(); }
}

export { jsonHash, validateCheckRegistry, promoteTaskWorkspace, discardTaskWorkspace };
