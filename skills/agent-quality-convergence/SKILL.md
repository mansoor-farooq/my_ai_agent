---
name: agent-quality-convergence
description: Use when multiple agents, specialists, or domain managers contribute to one task and their work must be combined into one evidence-backed, high-quality result.
---

# Agent Quality Convergence

Use one accountable manager and make every worker return the same compact result contract. Parallel execution improves throughput only when ownership and dependencies are explicit; convergence is the step that turns separate work into one reliable outcome.

## Work-item contract

Every item has: `id`, `role`, `scope`, `deliverable`, `readOnly`, `ownedPaths`, `dependsOn`, `acceptanceChecks`, and `stopCondition`. A worker may propose scope changes, but only the manager can approve them. One writer owns a path in a wave. Read-only reviewers may inspect changed paths after their dependencies complete.

## Worker result contract

Return exactly these sections:

1. `status`: complete, partial, failed, or blocked.
2. `scope`: what was inspected or changed, including routes/files and environment.
3. `findings`: each with severity, evidence, confidence, affected path/URL, and recommendation.
4. `changes`: exact paths changed, or an explicit empty list.
5. `checks`: command/tool, result, and artifact or output reference. Separate observed facts from assumptions.
6. `gaps`: unavailable providers, skipped flows, missing credentials, and unresolved risks.
7. `handoff`: dependencies, conflicts, and the next owner.

Do not claim a check, browser session, API result, worker execution, or performance improvement unless its output was observed. Never hide a failed or skipped branch to make the aggregate look green.

## Convergence protocol

1. The manager validates that every planned item returned a result. Missing results are blocked, not silently ignored.
2. Merge results by stable work-item id. Deduplicate only when the evidence and root cause match; preserve conflicting observations with their sources.
3. Apply the join policy: all required branches must complete for a pass; optional branches remain visible as gaps. A failed security, authorization, data-integrity, destructive-action, or mandatory browser/Lighthouse gate blocks completion.
4. Run one independent read-only verifier against the integrated changed paths and acceptance checks. It must receive the plan and worker results, not just a success claim.
5. The manager synthesizes the final report, resolves ownership conflicts, records residual risks, and reports the exact evidence boundary. Targeted repair may run at most twice and only for the failed checks.

## Quality gate

Pass only when scope, correctness, evidence, regression safety, and required provider gates are all satisfied. Otherwise return partial or blocked with the smallest next action. For browser work, functional/UI checks and the final Lighthouse run remain distinct evidence; Lighthouse cannot erase a failed scenario.
