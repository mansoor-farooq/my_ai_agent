---
name: workflow-queues-backpressure
description: Use when asynchronous workflow steps need a queue, worker pool, fan-out, throughput limits, backpressure, or protection from traffic spikes.
---

# Workflow Queues and Backpressure

Design queueing around workload, fairness and recovery instead of increasing concurrency blindly.

## Design

1. Estimate normal/peak arrival rate, service time, payload size, ordering and acceptable queue delay from evidence; mark estimates.
2. Bound queue depth, message size, worker concurrency, retries and in-flight work. Define admission control and overload response.
3. Choose ordering and partition keys to preserve only required business invariants; isolate tenants where fairness matters.
4. Add visibility timeout/lease renewal, heartbeat, dead-letter handling and poison-message strategy consistent with the chosen broker.
5. Keep large/private payloads in approved storage and queue a scoped reference with retention/access controls.
6. Expose queue age, depth, throughput, failure and saturation metrics. Alert on user impact, not just CPU.
7. Test burst traffic, slow dependencies, worker death, duplicate delivery and graceful shutdown.

Select a broker already present in the repository unless measured requirements justify a change.
