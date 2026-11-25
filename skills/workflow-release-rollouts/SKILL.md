---
name: workflow-release-rollouts
description: Use when deploying workflow changes, changing persisted process semantics, releasing integrations, enabling automation for tenants, or rolling back a process version.
---

# Workflow Release and Rollout

Release workflow code and data changes without stranding in-flight executions.

## Release plan

1. Identify workflow/API/schema versions and active runs affected by the change.
2. Decide compatibility, drain, migration, dual-read/write or version-pinning behavior for running executions.
3. Gate deployment with build, migration, security, integration and recovery checks from the repo.
4. Roll out by environment/tenant/cohort or feature flag when supported; define success and stop thresholds.
5. Ensure secrets/permissions are available only to the intended environment and job.
6. Define rollback and forward-fix paths, including how state created by the new version is read by the old version.
7. Verify the first real execution and record observed evidence, owner and rollback point.

Do not claim a release happened unless deployment evidence confirms it. Keep deployment approval separate from approval of the business workflow.
