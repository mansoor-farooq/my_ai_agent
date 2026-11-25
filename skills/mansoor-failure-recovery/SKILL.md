---
name: mansoor-failure-recovery
description: Use when a command, worker, test, browser session, build, or integration fails or becomes flaky.
---
# Mansoor Failure Recovery
Classify the failure as transient, deterministic, permission, scope, security, quota, environment or product defect. Retry only bounded transient failures with the same inputs; capture the signature and stop after the configured attempt budget. Repair the cause, not the symptom, and preserve the failed evidence for the manager.

Stop condition: one targeted repair has been verified, or the repeated signature is escalated with logs and next action.

