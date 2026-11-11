#!/usr/bin/env node

function list(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function referenceStage(task = {}, context = {}, input = {}) {
  return {
    schema: 'mansoor.core-loop-reference/v1',
    taskId: String(task.taskId || ''),
    claims: list(input.claims),
    sourceRefs: list(input.sourceRefs ?? input.source_refs),
    unverified: list(input.unverified),
    required: Boolean(input.required ?? task.referenceRequired),
    contextHash: context.contextHash || null,
  };
}

