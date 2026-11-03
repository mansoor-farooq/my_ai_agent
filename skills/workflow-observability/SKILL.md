---
name: workflow-observability
description: Use when automated processes need execution history, status visibility, metrics, tracing, alerts, operational dashboards, or audit evidence.
---

# Workflow Observability

Make a run diagnosable to an authorized operator without leaking payload secrets or private data.

## Signals

- Correlate project/tenant, workflow name/version, execution ID, step ID, attempt and trace ID.
- Emit state-transition events and structured error classes with timestamps and duration.
- Measure arrival rate, queue age, step latency, success/failure, retry count, approval wait, stale runs and cost/usage where available.
- Define actionable SLOs and alerts from user impact; include owner, runbook and suppression for expected pauses.
- Redact tokens, credentials, sensitive payload fields and unnecessary personal data before logs/traces.
- Keep UI execution history permission-filtered and distinguish live, stale, partial and unavailable data.

Test a failed and resumed run from the operator's point of view: can they identify the step, reason, next safe action and evidence without seeing unauthorized data?
