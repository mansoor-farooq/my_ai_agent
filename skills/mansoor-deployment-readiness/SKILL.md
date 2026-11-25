---
name: mansoor-deployment-readiness
description: Use when planning, reviewing, executing, or diagnosing application or infrastructure deployments, releases, rollouts, environment configuration, or production readiness.
---

# Mansoor Deployment Readiness

Own deployment readiness across platforms without assuming a provider or inventing commands. First identify the actual deployment path from repository evidence.

## Required preflight

Record these fields as observed, unknown, or not applicable:

- project/repository and source commit;
- target environment, platform/cluster/context, region/namespace and release identity;
- build job, immutable artifact/image digest and artifact provenance;
- configuration variable names and secret references only (never values);
- database migration order and old/new-version compatibility;
- deploy identity, required permissions and approval gate;
- health checks, smoke tests, rollout thresholds and stop signals;
- rollback target, rollback command/mechanism, data compatibility and backup/restore evidence;
- change window, expected impact and owner for incident escalation.

Do not fill missing values from convention. Mark them unknown and continue with repository inspection that does not need those values.

## Readiness sequence

1. Reverse engineer the repository’s manifests, CI workflow, build scripts, runtime configuration, migrations and runbooks. Identify the real provider and tool from files or verified host output.
2. Verify current platform syntax against the official documentation for the detected version. Check repository-pinned action, CLI and runtime versions; do not reuse remembered flags as proof.
3. Build once from the approved source revision. Bind tests and security checks to the exact artifact digest; never promote a different rebuild as if it were the tested artifact.
4. Check environment parity, identity scope, secret references, resource dependencies, migration compatibility, capacity, observability and rollback readiness.
5. Define progressive rollout and measurable health thresholds. State who/what stops rollout and which signals trigger rollback.
6. Keep preflight read-only. Production deployment, destructive migration, traffic cutover and external side effects require the host’s configured approval for that exact action.
7. After an authorized operation, report only observed command/platform output. Validate service health, key user journeys, telemetry and data integrity. If no operation ran, say “not run”; never imply a successful deployment.

## Release decision

Return `READY`, `BLOCKED`, or `NOT RUN`, with evidence for every gate. `READY` means prerequisites are evidenced and an approval-ready plan exists; it does not mean a deployment occurred. A missing artifact digest, target, authorization, health gate or viable rollback blocks a production-ready verdict.

## Stop condition

The target, artifact, environment, authorization, migration plan, health thresholds and rollback evidence are accounted for; missing evidence is named as a blocker; no live success is claimed without observed post-deploy results.
