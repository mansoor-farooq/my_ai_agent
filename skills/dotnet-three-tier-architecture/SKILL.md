---
name: dotnet-three-tier-architecture
description: Use when designing or repairing a .NET UI, business-logic and data-access architecture or explaining logical layers versus physical deployment tiers.
---

# .NET Three-Tier Architecture

Model three logical layers: Presentation/API, Business/Application Logic, and Data Access. A tier is a physical process or deployment boundary; a three-layer app may still deploy as one process.

## Dependency contract
- Presentation validates transport input and calls application use cases; it does not query the database directly.
- Business/application logic owns use cases and business rules; it does not depend on MVC, EF Core or infrastructure implementations.
- Data access implements persistence interfaces and maps storage concerns; it does not make business decisions.
- Dependencies point inward through stable interfaces. Avoid circular project references.

For each feature trace request → use case → persistence → response, then verify layer boundaries and failure behavior. Keep DTOs out of domain models.
