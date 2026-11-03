---
name: workflow-recovery-runbooks
description: Use when an automation can fail mid-process, become stuck, need operator replay, trigger incident response, or require safe manual recovery.
---

# Workflow Recovery Runbooks

Design the human recovery path alongside the happy path.

## Runbook contract

For each failure class, specify detection, user impact, safe diagnosis, retry/repair/cancel action, required role, data side effects, escalation owner and verification after repair. Include stuck-run detection, dependency outage, exhausted retries, invalid credentials, data conflicts, dead-letter messages and failed compensation.

Operator actions must be idempotent where possible, confirm their target execution, record actor/reason/time and show the result. Never instruct an operator to edit production rows manually when an audited command or product action exists. Document rollback limits and when replay would duplicate an external effect.

Add a recovery drill/test for at least one transient failure and one partial side-effect failure.
