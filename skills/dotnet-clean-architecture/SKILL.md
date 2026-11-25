---
name: dotnet-clean-architecture
description: Use when structuring .NET solutions around domain/application core with infrastructure and delivery mechanisms at the edges.
---

# .NET Clean Architecture

Keep Domain independent of frameworks. Application defines use cases and ports. Infrastructure implements persistence, messaging and external clients. Web/API is a composition and delivery edge.

Typical references: `Web -> Application -> Domain`, `Infrastructure -> Application/Domain`; register implementations at the composition root. Do not add a layer without a responsibility. Verify project references and test the domain without a database. For simple CRUD, a layered monolith may be more maintainable.
