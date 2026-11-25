---
name: workflow-human-approval-gates
description: Use when a process requires a person to approve, reject, review, sign off, release, or confirm a consequential step or visual implementation direction.
---

# Human Approval Gates

Represent approval as an authorized, persisted state transition with evidence—not a button that merely changes the screen.

## Approval contract

1. Name the decision, approver role, eligible records, required evidence and exact version being reviewed.
2. Persist `pending`, `approved`, `rejected`, `cancelled` or a repository/domain-specific equivalent; record actor, time, reason and reviewed version.
3. Enforce role/tenant authorization on the server. Prevent self-approval or separation-of-duties violations when policy requires it.
4. Make approval/rejection idempotent and concurrency-safe; a stale approval must not authorize a changed payload.
5. Define expiry, delegation, escalation, withdrawal, resubmission and notification behavior.
6. Show the approver a data-backed summary, changes, risks and evidence before enabling the action.
7. Test permitted/denied actors, duplicate clicks, stale version, rejection, expiry and audit history.

For agent implementation: a material new UI direction gets a preview/wireframe and waits for the user's approval before source edits. After approval, continue without asking the user to select skills or agents. Product runtime approvals are a separate persisted business workflow.

References: [Google Cloud Workflows callbacks](https://docs.cloud.google.com/workflows/docs/creating-callback-endpoints), [GitHub deployment environment approvals](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments).
