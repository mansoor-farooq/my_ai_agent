---
name: workflow-durable-execution
description: Use when workflows can outlive a request/process, wait for people or external events, resume after crashes, or must retain progress over long-running steps.
---

# Durable Workflow Execution

Treat a long-running workflow as persisted state, not a process held open in memory.

## Production design

1. Define execution identity, workflow version, current step, input reference, timestamps, lease/heartbeat and terminal outcome.
2. Persist checkpoints before waiting or acknowledging work. On resume, reconstruct from durable state and verify referenced data still exists.
3. Separate deterministic orchestration decisions from nondeterministic I/O activities. Keep external calls behind retryable activity boundaries.
4. Use bounded waits, heartbeats for long activities, cancellation propagation and explicit timeout outcomes.
5. Make side effects idempotent or record an outbox/operation key before retries. Never assume a process restart implies an external request did not happen.
6. Define deployment/version compatibility for executions started under older workflow code.
7. Compare the existing queue/workflow platform with a durable engine only when recovery guarantees justify the operational cost.

Useful primary reference: [Google Cloud Workflows overview](https://cloud.google.com/workflows). Record the chosen engine's current limits and guarantees from its official documentation.
