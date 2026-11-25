---
name: node-observability-resilience
description: Use when structured logs, metrics, traces, health, timeout, retry and graceful degradation design.
---

# Node observability and resilience

Propagate trace/correlation context; emit low-cardinality metrics and actionable structured logs without secrets/PII. Set timeouts at every network boundary, retry only safe/idempotent operations, use jitter and budgets, and define readiness versus liveness. Test dependency outage behavior.

## Operating method
1. Read the repository instructions, manifests, existing architecture and tests before selecting an implementation pattern.
2. State assumptions and constraints; confirm framework/runtime versions from the lockfile and official docs where APIs may have changed.
3. Trace the real request/data flow and define the contracts and failure cases before editing.
4. Make the smallest coherent change, preserving established patterns unless evidence supports a migration.
5. Verify the changed behavior with focused tests, static checks and runtime evidence available in the project.
6. Report files changed, commands and outcomes, known limits, security implications and rollback/next steps.

## Collaboration contract
- Send the lead a compact handoff: scope, findings, proposed contract, owned files, risks, verification and open decisions.
- Review adjacent specialists' contracts before implementation; resolve incompatible assumptions in the lead's decision log.
- Parallelize only work with disjoint file ownership. One builder owns a shared file at a time.
- Do not claim a test, benchmark, deployment or data inspection that was not run. Avoid exporting project material outside the repository's approved context policy.
