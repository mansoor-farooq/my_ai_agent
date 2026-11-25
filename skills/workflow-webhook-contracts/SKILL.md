---
name: workflow-webhook-contracts
description: Use when implementing inbound/outbound webhooks, callbacks, event subscriptions, external event triggers, or webhook delivery/replay behavior.
---

# Workflow Webhook Contracts

Specify delivery, security and ordering semantics before wiring handlers.

## Inbound

- Authenticate the sender with a signature or platform-supported identity; validate timestamp/replay window and constant-time compare where applicable.
- Enforce payload/content-size limits, schema/version checks, tenant mapping and request timeouts.
- Durably record receipt and event ID before acknowledging; return stable response codes and process asynchronously when work is long.
- Deduplicate repeated IDs; handle out-of-order events using entity versions/timestamps only when the provider contract guarantees them.
- Provide a replay-safe operator path with audit and authorization.

## Outbound

Use signed requests, bounded retries/backoff, delivery IDs, timeout budgets, secret rotation and a delivery log that redacts payload secrets/PII. Test signature mismatch, replay, duplicate, malformed payload, rate-limit response and subscriber outage. Document provider retry and ordering behavior from its current official docs.
