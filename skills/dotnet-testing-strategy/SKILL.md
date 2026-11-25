---
name: dotnet-testing-strategy
description: Use when planning or improving unit, integration, contract or end-to-end testing for .NET products.
---

# .NET Testing Strategy

Choose test level by risk: unit tests for deterministic rules, integration tests for database/framework boundaries, contract tests for APIs/events, and a few end-to-end tests for critical journeys. Prefer real behavior over over-mocking. Keep tests isolated, deterministic and readable. Run focused tests during changes and the repository's full supported suite before release when requested. Never claim unrun checks passed.
