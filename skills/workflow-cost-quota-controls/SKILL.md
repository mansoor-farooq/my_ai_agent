---
name: workflow-cost-quota-controls
description: Use when automation consumes paid APIs, model tokens, cloud workflow steps, provider quotas, high-volume events, or unbounded retries/fan-out.
---

# Workflow Cost and Quota Controls

Bound resource use before a workflow reaches a provider or expensive fan-out.

## Controls

1. Inventory billable calls, execution steps, storage, tokens, retries, polling and egress.
2. Estimate normal/peak cost from measured or documented unit pricing; label unknown prices and re-check current official price/quota pages.
3. Set per-run, per-tenant and global budgets, concurrency caps, payload limits and maximum wait/attempt duration.
4. Use provider `Retry-After`, quota-aware backoff and circuit breakers; avoid account/key rotation to evade provider limits.
5. Emit usage/cost per execution where available and alert on anomalous growth or exhausted budgets.
6. Define graceful behavior: queue, defer, reduce optional work or stop with an actionable status.

Test worst-case fan-out and retry budget using a dry-run or simulation. Do not invent current prices or promise a cost saving without measurements.
