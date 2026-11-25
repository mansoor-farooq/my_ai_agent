#!/usr/bin/env node

function list(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

export function contextStage(task = {}, input = {}) {
  return {
    schema: 'mansoor.core-loop-context/v1',
    projectId: String(task.projectId || ''),
    taskId: String(task.taskId || ''),
    objective: String(task.objective || ''),
    relevantFiles: list(input.relevantFiles ?? input.files),
    verifiedFacts: list(input.verifiedFacts ?? input.facts),
    projectRules: list(input.projectRules ?? input.rules),
    memoryCitations: list(input.memoryCitations ?? input.citations),
    scope: list(task.scope),
    acceptance: list(task.acceptance),
    forbiddenPaths: list(task.forbiddenPaths ?? task.forbidden_paths),
    contextHash: input.contextHash ? String(input.contextHash) : null,
  };
}

