#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { contextStage } from './stages/context.mjs';
import { planStage } from './stages/plan.mjs';
import { referenceStage } from './stages/reference.mjs';
import { actStage } from './stages/act.mjs';
import { verifyStage, runChecks } from './stages/verify.mjs';
import { repairStage } from './stages/repair.mjs';
import { answerStage } from './stages/answer.mjs';
import { rememberStage } from './stages/remember.mjs';

export const STAGES = Object.freeze(['INTAKE', 'CONTEXT', 'PLAN', 'REFERENCE', 'ACT', 'VERIFY', 'REPAIR', 'ANSWER', 'REMEMBER', 'COMPLETE', 'ESCALATED']);

const transitions = new Map([
  ['INTAKE', new Set(['CONTEXT', 'ANSWER', 'ESCALATED'])],
  ['CONTEXT', new Set(['PLAN', 'ANSWER', 'ESCALATED'])],
  ['PLAN', new Set(['REFERENCE', 'ANSWER', 'ESCALATED'])],
  ['REFERENCE', new Set(['ACT', 'ANSWER', 'ESCALATED'])],
  ['ACT', new Set(['VERIFY', 'ANSWER', 'ESCALATED'])],
  ['VERIFY', new Set(['REPAIR', 'ANSWER', 'ESCALATED'])],
  ['REPAIR', new Set(['ACT', 'ANSWER', 'ESCALATED'])],
  ['ANSWER', new Set(['REMEMBER', 'COMPLETE', 'ESCALATED'])],
  ['REMEMBER', new Set(['COMPLETE', 'ESCALATED'])],
  ['COMPLETE', new Set()],
  ['ESCALATED', new Set()],
]);

export function transition(from, to) {
  if (!STAGES.includes(from) || !STAGES.includes(to) || !transitions.get(from)?.has(to)) {
    throw new Error(`Illegal core-loop transition: ${from} -> ${to}`);
  }
  return { from, to };
}

function list(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function safeTask(task = {}) {
  const objective = String(task.objective || '').trim();
  const scope = list(task.scope);
  const acceptance = list(task.acceptance);
  const taskId = String(task.taskId || task.task_id || '').trim();
  const projectDir = path.resolve(String(task.projectDir || task.project_dir || '').trim());
  const errors = [];
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(taskId)) errors.push('invalid-task-id');
  if (!objective) errors.push('objective-required');
  if (!scope.length) errors.push('scope-required');
  if (!acceptance.length) errors.push('acceptance-required');
  if (!projectDir || !fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) errors.push('project-directory-required');
  if (errors.length) {
    const error = new Error(`Invalid task: ${errors.join(', ')}`);
    error.code = 'INVALID_TASK';
    error.errors = errors;
    throw error;
  }
  return {
    ...task,
    taskId,
    projectId: String(task.projectId || task.project_id || ''),
    projectDir,
    objective,
    scope,
    acceptance,
    forbiddenPaths: list(task.forbiddenPaths ?? task.forbidden_paths),
    requiredEvidence: list(task.requiredEvidence ?? task.required_evidence),
  };
}

function callable(value, fallback) {
  return typeof value === 'function' ? value : fallback;
}

export async function runCoreLoop(inputTask, deps = {}) {
  let task;
  try {
    task = safeTask(inputTask);
  } catch (error) {
    return { status: 'blocked', lifecycle: 'ESCALATED', blockers: error.errors || [error.message], error };
  }

  const stages = {
    context: callable(deps.stages?.context, contextStage),
    plan: callable(deps.stages?.plan, planStage),
    reference: callable(deps.stages?.reference, referenceStage),
    act: callable(deps.stages?.act, actStage),
    verify: callable(deps.stages?.verify, verifyStage),
    repair: callable(deps.stages?.repair, repairStage),
    answer: callable(deps.stages?.answer, answerStage),
    remember: callable(deps.stages?.remember, rememberStage),
  };
  const checkpoint = callable(deps.checkpoint, () => undefined);
  const executeAction = callable(deps.executeAction, async () => ({ actions: [], changedPaths: [], evidence: [] }));
  const checkRunner = callable(deps.runChecks, runChecks);
  const actionProvider = callable(deps.actionProvider, () => []);
  const stopSignalProvider = deps.stopSignal;
  const state = { task, lifecycle: null, attempt: 0, context: null, plan: null, reference: null, act: null, verification: null, repair: null, answer: null, memory: null, changes: [], evidence: [], blockers: [] };

  const move = async (next, data = {}) => {
    const from = state.lifecycle;
    if (from) transition(from, next);
    await checkpoint({ phase: 'before-transition', from, to: next, taskId: task.taskId, ...data });
    state.lifecycle = next;
    await checkpoint({ phase: 'after-transition', from, to: next, taskId: task.taskId, ...data });
  };
  const escalate = async (reason, data = {}) => {
    state.blockers = [...new Set([...state.blockers, String(reason)])];
    await move('ANSWER', { reason });
    state.escalated = true;
    state.answer = stages.answer({ ...state, status: 'escalated', blockers: state.blockers, ...data });
    await checkpoint({ phase: 'before-escalation', taskId: task.taskId, reason });
    await move('ESCALATED', { reason });
    return { ...state.answer, lifecycle: state.lifecycle, taskId: task.taskId, attempt: state.attempt, memory: state.memory };
  };

  await move('INTAKE');
  await move('CONTEXT');
  state.context = stages.context(task, deps.contextInput || {});
  await move('PLAN');
  state.plan = stages.plan(task, state.context, deps.planInput || {});
  if (state.plan.approved !== true) return escalate('plan-not-approved', { nextAction: 'approve-plan' });
  await move('REFERENCE');
  state.reference = stages.reference(task, state.context, deps.referenceInput || {});
  if (state.reference.required && state.reference.unverified.length) return escalate('reference-unverified', { nextAction: 'resolve-references' });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    state.attempt = attempt;
    await move('ACT', { attempt });
    await checkpoint({ phase: 'before-act', taskId: task.taskId, attempt });
    const proposedActions = await actionProvider({ task, context: state.context, plan: state.plan, reference: state.reference, attempt });
    state.act = stages.act(task, state.plan, proposedActions, { projectDir: task.projectDir });
    if (state.act.scopeViolation) return escalate('scope-violation', { scopeViolation: true, changes: [] });
    const executed = await executeAction({ task, plan: state.plan, act: state.act, attempt });
    state.changes = list(executed?.changedPaths ?? state.act.changes);
    state.evidence = list(executed?.evidence);
    await checkpoint({ phase: 'after-act', taskId: task.taskId, attempt, changedPaths: state.changes });
    await move('VERIFY', { attempt });
    await checkpoint({ phase: 'before-verify', taskId: task.taskId, attempt });
    const verificationPlan = stages.verify({ taskId: task.taskId, registry: deps.checkRegistry || state.plan.checks, changedPaths: state.changes, acceptance: task.acceptance });
    state.verification = await checkRunner(verificationPlan.checks, { changedPaths: state.changes }, { cwd: task.projectDir });
    await checkpoint({ phase: 'after-verify', taskId: task.taskId, attempt, verification: state.verification });
    const stopSignal = typeof stopSignalProvider === 'function' ? await stopSignalProvider({ ...state }) : Boolean(stopSignalProvider);
    if (stopSignal) return escalate('stop-signal', { stopSignal: true });
    if (state.verification.allPassed === true) {
      await move('ANSWER');
      state.answer = stages.answer({ ...state, status: 'complete', evidence: state.evidence, verification: state.verification });
      await checkpoint({ phase: 'before-answer', taskId: task.taskId, answer: state.answer });
      await move('REMEMBER');
      state.memory = stages.remember({ ...state, verification: state.verification, verifiedFacts: deps.verifiedFacts || [], sourceRefs: deps.sourceRefs || [] });
      await move('COMPLETE');
      return { ...state.answer, lifecycle: state.lifecycle, taskId: task.taskId, attempt, memory: state.memory };
    }
    const failedChecks = state.verification.failedChecks || [];
    const repair = stages.repair({ taskId: task.taskId, attempt, maxAttempts: 3, failedChecks, affectedPaths: state.changes, evidence: state.evidence });
    state.repair = repair;
    if (!repair.retry) return escalate(repair.reason || 'attempt-limit', { verification: state.verification, changes: state.changes });
    await move('REPAIR', { attempt, failedChecks });
    const repairInput = await (deps.repairAction || (async () => ({})))({ task, plan: state.plan, repair, attempt });
    state.plan = stages.plan(task, state.context, { ...state.plan, ...repairInput, approved: true });
  }
  return escalate('attempt-limit');
}

export { safeTask };

