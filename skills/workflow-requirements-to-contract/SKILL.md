---
name: workflow-requirements-to-contract
description: Use when converting business requests, research findings, or vague process descriptions into implementable workflow requirements and acceptance criteria.
---

# Workflow Requirements to Contract

Turn research and stakeholder intent into testable behavior before implementation.

## Contract sections

- **Outcome and actors:** who starts, observes, approves, retries, cancels and owns the result.
- **Trigger and input:** source event, schema/version, required fields, validation and correlation identity.
- **Steps and branches:** decisions, conditions, ordering, parallel work, waits and terminal states.
- **Data contract:** source of truth, writes, ownership, retention, privacy class and audit events.
- **Failure contract:** retryable/permanent errors, timeout, compensation, manual recovery and user-visible status.
- **Approval contract:** approver role, what is being approved, version/hash, expiry and rejection path.
- **Acceptance:** observable outcomes, negative paths, performance/volume limits and accessibility requirements for UI.

Write Given/When/Then cases for normal, boundary, denial, duplicate, timeout and partial-failure paths. Resolve contradictions against the repository and official product docs. Flag only decisions that materially change user policy, data meaning, legal obligations or destructive behavior.
