---
name: mansoor-premium-backend-tenant-isolation
description: Use when a multi-tenant service reads or writes organization, branch, customer, inventory, billing, or user-owned data.
---
# Premium Backend Tenant Isolation
Trace tenant identity from session to handler, service, query, cache, job and event. Enforce server-side scoping at every layer, test cross-tenant reads/writes and prevent tenant IDs from becoming trusted client input. Keep background jobs bound to the originating tenant.

Stop condition: cross-tenant negative tests pass for every changed data path.

