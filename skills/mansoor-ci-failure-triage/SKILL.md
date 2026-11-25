---
name: mansoor-ci-failure-triage
description: Use when GitHub Actions, CI pipelines, checks, build workflows, or release gates fail or become nondeterministic.
---
# Mansoor CI Failure Triage
Inspect authenticated run metadata and the narrow failing log first. Reproduce locally with the same runtime/lockfile when possible, classify infrastructure versus product failure, and change only the workflow or code path proven responsible. Keep secrets and external provider actions out of logs and scope.

Stop condition: the failing check is fixed and rerun evidence exists, or the failure is blocked by CI access/environment.

