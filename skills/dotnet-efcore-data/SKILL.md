---
name: dotnet-efcore-data
description: Use when designing or changing EF Core models, DbContext configuration, queries, persistence boundaries or database behavior.
---

# EF Core Data Engineering

Inspect EF Core version, provider, migrations and existing access pattern. Configure mappings explicitly where conventions obscure the schema. Use async queries, cancellation, projections and `AsNoTracking` for read-only work. Avoid lazy-loading N+1 behavior and leaking tracked entities through APIs. Keep `DbContext` scoped; handle concurrency and transaction boundaries deliberately. Verify generated SQL or query plans for expensive paths.
