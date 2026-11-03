---
name: workflow-dag-orchestration
description: Use when a process contains dependent steps, parallel branches, joins, fan-out/fan-in, conditional routing, or cross-service orchestration.
---

# Workflow DAG Orchestration

Choose a readable execution graph that makes dependencies and side effects visible.

## Procedure

1. Convert the step list into a directed graph; label data passed on each edge and each external side effect.
2. Check for cycles, missing prerequisites, race conditions and joins that wait forever on optional branches.
3. Parallelize only independent work. Bound fan-out, concurrency and per-tenant resource use.
4. Define join policy: all-success, quorum, first-success or collect-partial-results, and what happens when a branch fails.
5. Keep business decisions in named conditions/subworkflows rather than opaque expressions.
6. Persist graph/version identity for executions that may resume across deployments; do not silently change an in-flight graph's semantics.
7. Select a workflow engine only after comparing the project's current stack and durability needs.

Deliver a Mermaid graph or numbered dependency table plus failure/join behavior. If the graph can be a simple function or queue chain, keep it simple.
