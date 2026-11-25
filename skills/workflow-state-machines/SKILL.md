---
name: workflow-state-machines
description: Use when an automated process has statuses, approval decisions, retries, cancellation, resume, parallel branches, or different allowed actions over time.
---

# Workflow State Machines

Model lifecycle and legal transitions explicitly instead of scattering status strings across the app.

## Design

1. List terminal and non-terminal states from actual business requirements.
2. Define each transition as `from + command/event + guard -> to + effects`.
3. Separate workflow state from individual task/step state when they can progress independently.
4. Include actor authorization, optimistic concurrency/version checks, timestamps and reason fields for consequential transitions.
5. Specify duplicate, late, out-of-order and concurrent events; reject illegal transitions with stable errors.
6. Define pause, cancel, timeout, resume, retry and compensation semantics, including what happens to in-flight side effects.
7. Render the same state model in APIs, database constraints, tests, audit history and UI labels.

Provide a transition table and tests for every allowed path plus representative forbidden transitions. Do not invent business states; mark missing policy for decision.
