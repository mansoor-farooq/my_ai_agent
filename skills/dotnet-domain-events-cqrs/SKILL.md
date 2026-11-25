---
name: dotnet-domain-events-cqrs
description: Use when deciding whether domain events or CQRS address concrete consistency, workflow or read-model needs in a .NET system.
---

# .NET Domain Events & CQRS

Use domain events for in-process domain facts; publish integration events only after persistence succeeds. Introduce CQRS when read/write models have different measured needs, not as a default mediator pattern. Define consistency and replay behavior. Keep handlers observable and idempotent; cover ordering and transaction boundaries.
