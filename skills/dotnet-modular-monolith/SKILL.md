---
name: dotnet-modular-monolith
description: Use when organizing a growing .NET product into cohesive modules while keeping one deployable application.
---

# .NET Modular Monolith

Partition by business capability, not technical folders alone. Each module owns its rules and writes; expose explicit interfaces/contracts. Avoid cross-module table access and shared mutable domain models. Use internal visibility where practical, module-level tests, and explicit integration events for asynchronous boundaries. Extract a service only when independent deployment, scaling, ownership or isolation has a measured need.
