---
name: workflow-retries-compensation
description: Use when workflows call unreliable services, perform multi-step writes, need retry/backoff policy, or must undo/repair partial side effects.
---

# Workflow Retries and Compensation

Retry only failures that are plausibly transient; recover permanent and partial failures deliberately.

## Policy

1. Classify errors as transient, permanent, policy/authorization, validation, conflict or unknown.
2. Set attempt and elapsed-time budgets, exponential backoff, jitter, retryable status/error codes and cancellation behavior.
3. Check idempotency and operation status before retrying writes. Respect provider `Retry-After` and rate limits.
4. Avoid retry multiplication across caller, SDK, queue and workflow layers; assign one owner for each retry policy.
5. For multi-step business effects, define forward action and compensating action, their idempotency and ordering. A compensation is a new audited action, not time travel.
6. Send exhausted operations to a visible failed/review queue with reason, trace ID and safe replay controls.

Test repeated transient failure, permanent failure, timeout after commit, compensation failure and cancellation during backoff. See [Google's retry syntax](https://docs.cloud.google.com/workflows/docs/reference/syntax/retrying) for one engine's documented distinction between idempotent and non-idempotent retries.
