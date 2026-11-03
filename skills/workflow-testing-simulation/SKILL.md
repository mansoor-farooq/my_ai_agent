---
name: workflow-testing-simulation
description: Use when designing or changing automation conditions, transitions, integrations, schedules, retries, approvals, or user-visible execution states.
---

# Workflow Testing and Simulation

Test the process as a stateful system, including side effects and partial failure.

## Test layers

1. Unit-test guards, mapping, transition rules, idempotency and retry classification deterministically.
2. Contract-test provider payloads, API schemas, signature verification and version compatibility.
3. Integration-test database transactions, outbox/inbox, queue semantics, permissions and migrations using the repository's actual test setup.
4. Simulate failure at every side-effect boundary: before call, timeout after remote commit, duplicate event, retry exhaustion, compensation failure and resume after restart.
5. Test schedule boundaries, concurrent runs, stale approval versions and unauthorized operators.
6. Browser-test the real operator UI against seeded test records, including empty, loading, error, stale and success states. Never point simulation at production data.
7. Keep test fixtures labeled and isolated. A passing fake provider is not evidence that a live integration works.

Report the scenario matrix and observed commands/results. Do not claim production readiness from unit tests alone.
