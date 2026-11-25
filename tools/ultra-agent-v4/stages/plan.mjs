#!/usr/bin/env node

function list(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

export function planStage(task = {}, context = {}, input = {}) {
  return {
    schema: 'mansoor.core-loop-plan/v1',
    taskId: String(task.taskId || ''),
    projectId: String(task.projectId || context.projectId || ''),
    steps: list(input.steps),
    assumptions: list(input.assumptions),
    affectedPaths: list(input.affectedPaths ?? input.affected_paths),
    checks: list(input.checks),
    rollback: input.rollback == null ? null : String(input.rollback),
    approved: input.approved === true,
  };
}

