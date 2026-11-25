---
name: workflow-intake-and-scope
description: Use when a request describes a business process, multi-step automation, approval flow, background job, integration sequence, or repeated operational task.
---

# Workflow Intake and Scope

Convert a short request into a bounded automation brief before choosing a platform or coding.

## Procedure

1. Inspect the repository, existing process, UI, API, database schema, runtime and constraints. Separate observed facts from assumptions.
2. Define the outcome, actors, trigger, inputs, outputs, success condition, expected volume, timing and failure owner.
3. Draw the current path and proposed path as named steps, decisions, waits and side effects. Identify human actions explicitly.
4. Reuse the smallest existing scheduler, queue, workflow engine or service that satisfies durability and operational needs. Do not introduce a platform just because the word “workflow” appears.
5. Route to the relevant workflow skills and stack skills automatically; do not ask the user to choose agents.
6. Name missing business decisions that block safe implementation. Infer only routine technical details from repository evidence.

## Handoff

Return a scope brief with actors, trigger, step outline, data boundaries, success/failure behavior, approval points, acceptance criteria and unresolved blockers. Keep it short enough to become a build contract.
