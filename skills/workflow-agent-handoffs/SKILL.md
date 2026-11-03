---
name: workflow-agent-handoffs
description: Use when a project workflow delegates independent work to multiple agents, subagents, or provider-backed workers that must coordinate safely.
---

# Workflow Agent Handoffs

Coordinate specialized workers through explicit contracts while retaining one accountable manager.

## Handoff protocol

1. The manager owns user intent, project identity, approvals, shared-file ownership and final result.
2. Decompose into independent tasks with one owner, exact files, required skills, inputs, output schema, stop condition and evidence request.
3. Pass only project-scoped context required for that task. Never pass credentials, unrelated project memory or hidden reasoning.
4. Workers return findings/options/evidence; only the manager resolves conflicts and authorizes shared contract changes.
5. Parallelize disjoint tasks; sequence schema/API/UI tasks when they depend on an agreed contract.
6. Give a verifier the acceptance criteria, changed files, relevant tests and risk cases, not just the builder's success claim.
7. Limit retries and fallback by provider policy; do not rotate accounts/keys to evade limits.

Keep one persistent lead agent; subagents are scoped execution roles, not a growing permanent roster.
