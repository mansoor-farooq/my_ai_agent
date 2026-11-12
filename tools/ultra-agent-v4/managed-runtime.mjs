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
  const lockDir = path.join(projectDir, '.agents', 'ultra-v4', 'locks');
  fs.mkdirSync(lockDir, { recursive: true });
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
  fs.appendFileSync(filePath, `${JSON.stringify(clean)}\n`, { encoding: 'utf8', mode: 0o600 });
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

function executeManagedWrites(policy, actions, ledger) {
  const changedPaths = [];
  const evidence = [];
  let replayedWrites = 0;
  for (const action of actions) {
    const decision = authorizeManagedAction(policy, action);
    if (!decision.allowed) return { scopeViolation: true, violation: decision.code, changedPaths: [], evidence: [], replayedWrites };
    const relativePath = decision.path;
    const bytes = Buffer.from(action.content, 'utf8');
    const contentHash = sha256(bytes);
    const input = { projectId: policy.task.projectId, taskId: policy.task.taskId, action: 'write-file', target: relativePath, payload: contentHash };
    const effectKey = createEffectKey(input);
    const claim = claimEffect({ ...input, effectKey }, ledger);
    const destination = path.resolve(policy.task.projectDir, relativePath);
    if (!within(policy.task.projectDir, destination)) return { scopeViolation: true, violation: 'outside-project-root', changedPaths: [], evidence: [], replayedWrites };
    if (!claim.claimed) {
      const currentHash = fs.existsSync(destination) && fs.statSync(destination).isFile() ? sha256(fs.readFileSync(destination)) : null;
      if (claim.record.status === 'completed' && currentHash === contentHash) {
        replayedWrites += 1;
        changedPaths.push(relativePath);
        evidence.push(`write:${relativePath}:${contentHash}`);
        continue;
      }
      if (claim.record.status === 'claimed' && currentHash === contentHash) {
        completeEffect(effectKey, { contentHash, replayRecovered: true }, ledger);
        replayedWrites += 1;
        changedPaths.push(relativePath);
        evidence.push(`write:${relativePath}:${contentHash}`);
        continue;
      }
      return { scopeViolation: true, violation: 'effect-replay-conflict', changedPaths: [], evidence: [], replayedWrites };
    }
    const targetPath = atomicWrite(policy.task.projectDir, relativePath, action.content);
    const writtenHash = sha256(fs.readFileSync(targetPath));
    if (writtenHash !== contentHash) return { scopeViolation: true, violation: 'write-hash-mismatch', changedPaths: [], evidence: [], replayedWrites };
    completeEffect(effectKey, { contentHash }, ledger);
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
  try {
    const taskId = safeTaskId(input.task?.taskId);
    projectRoot = path.resolve(String(input.task?.projectDir || ''));
    if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) return blocked('project-directory-required');
    if (typeof deps.approvePlan !== 'function') return blocked('host-approval-adapter-required');
    const plan = { ...(input.plan || {}) };
    const identity = { projectId: String(input.task?.projectId || ''), taskId };
    const workspaceInspection = inspectTaskWorkspace({ projectDir: projectRoot, ...identity, workspaceRoot: deps.workspaceRoot });
    if (!workspaceInspection.ok) return blocked(workspaceInspection.reason || 'workspace-inspection-failed');
    const requiredApproval = {
      taskId,
      projectId: identity.projectId,
      objective: String(input.task?.objective || ''),
      scope: input.task?.scope || [],
      acceptance: input.task?.acceptance || [],
      repositoryRoot: workspaceInspection.repoRoot,
      baseRevision: workspaceInspection.baseRevision,
      workspaceId: workspaceInspection.workspaceId,
      affectedPaths: plan.affectedPaths || [],
      steps: plan.steps || [],
      assumptions: plan.assumptions || [],
      rollback: plan.rollback || null,
      checks: (plan.checks || []).map((check) => ({ id: check.id, tool: check.tool, args: check.args, cwd: check.cwd })),
    };
    const approvalResult = await deps.approvePlan({ ...requiredApproval, planHash: jsonHash(requiredApproval) });
    if (approvalResult !== true && approvalResult?.approved !== true) return blocked('owner-plan-approval-required');
    const approval = approvalResult === true ? { approved: true, actor: 'host-approval-adapter' } : approvalResult;
    const approvalPayloadHash = jsonHash(requiredApproval);
    const forbiddenPaths = input.task.forbiddenPaths || input.task.forbidden_paths || [];
    workspace = createOrResumeTaskWorkspace({
      projectDir: projectRoot,
      ...identity,
      planHash: approvalPayloadHash,
      allowedPaths: plan.affectedPaths || [],
      forbiddenPaths,
      workspaceRoot: deps.workspaceRoot,
      expectedBaseRevision: requiredApproval.baseRevision,
    });
    releaseLock = acquireTaskLock(projectRoot, taskId);
    const executionTask = { ...input.task, taskId, projectDir: workspace.workspaceDir };
    const executionPlan = { ...plan, checks: normalizePlanChecks(plan.checks, projectRoot) };
    policy = await createManagedPolicy({ task: executionTask, plan: executionPlan, approval, ruleRegistry: deps.ruleRegistry, hubRoot: deps.hubRoot || HUB_ROOT });
    if (!policy.ok) return blocked(policy.reason, { policyErrors: policy.errors || [] });
    trace = await startTrace({ dir: projectRoot, taskId, projectId: input.task.projectId });
    const runDir = path.join(projectRoot, '.agents', 'ultra-v4', 'managed-runs', taskId);
    checkpointFile = path.join(runDir, 'events.jsonl');
    const ledgerPath = path.join(runDir, 'effects.jsonl');
    const ledger = deps.effectStore || new EffectLedger(ledgerPath);
    const events = [];
    let replayedWrites = 0;
    const checkpoint = async (event) => {
      const record = { taskId, projectId: input.task.projectId, workspaceId: workspace.workspaceId, baseRevision: workspace.baseRevision, planHash: policy.approval.planHash, traceId: trace.traceId, ...event };
      appendCheckpoint(checkpointFile, record);
      events.push(record);
      await recordSpan(trace, { kind: event.phase || 'checkpoint', name: event.to || event.phase || '', status: 'observed', details: JSON.stringify({ attempt: event.attempt, reason: event.reason, changedPaths: event.changedPaths }) });
      if (typeof deps.checkpoint === 'function') await deps.checkpoint(record);
    };
    const checkRegistry = executionPlan.checks || [];
    const result = await runCoreLoop({
      ...executionTask,
      taskId,
      projectId: input.task.projectId,
      projectDir: workspace.workspaceDir,
      requiredEvidence: policy.requiredEvidence,
    }, {
      planInput: { ...executionPlan, approved: true },
      checkRegistry,
      actionProvider: async ({ attempt }) => attempt === 1 ? (input.actions || []) : (input.repairActions?.[attempt] || []),
      checkpoint,
      stopSignal: deps.stopSignal,
      runChecks: async (checks, changes, options) => {
        const result = await (deps.runChecks || runChecks)(checks, changes, options);
        const evidence = (result.checks || []).filter((item) => item.status === 'pass').map((item) => `check:${item.id}`);
        return { ...result, evidence };
      },
      executeAction: async ({ act }) => {
        const result = executeManagedWrites(policy, act.allowedActions || [], ledger);
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
    }
    let final = { ...result, evidence: [...new Set(evidence)], policy: { ruleIds: policy.ruleIds }, traceId: trace.traceId, tracePath: trace.path, checkpointPath: checkpointFile, replayedWrites, workspace, delivery };
    if (result.status === 'complete' && missingEvidence.length) final = { ...final, status: 'unverified', blockers: [...(final.blockers || []), ...missingEvidence.map((item) => `required-evidence-missing:${item}`)], nextAction: 'collect-required-evidence' };
    await finishTrace(trace, { status: final.status, details: JSON.stringify({ taskId, workspaceId: workspace.workspaceId, deliveryStatus: delivery.status, changedPaths: delivery.changedPaths || final.changes, blockers: final.blockers }) });
    return final;
  } catch (error) {
    if (trace) {
      try { await recordSpan(trace, { kind: 'managed-runtime-error', status: 'blocked', details: error.message }); await finishTrace(trace, { status: 'blocked', details: error.message }); } catch {}
    }
    const reason = error.code || (error.message === 'task-already-running' ? error.message : 'managed-runtime-failed');
    return blocked(reason, { error: redactTrace(error.message), traceId: trace?.traceId || null, tracePath: trace?.path || null, workspace: workspace || null });
  } finally {
    releaseLock?.();
  }
}

export { jsonHash, validateCheckRegistry, promoteTaskWorkspace, discardTaskWorkspace };
