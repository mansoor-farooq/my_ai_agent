---
name: dotnet-solution-architect
description: Use when choosing or reviewing architecture for a new or existing .NET product, including monolith, modular monolith, layered, clean, or service-based designs.
---

# .NET Solution Architect

Start from business boundaries, team size, deployment needs and operational capacity. Prefer the simplest architecture that meets known requirements. Do not select microservices by default.

1. Inspect target frameworks, solution/project graph, hosting, persistence, tests and deployment manifests.
2. Map business capabilities and quality needs: security, availability, scale, latency, data ownership and change rate.
3. Compare a layered monolith, modular monolith and distributed services only where justified.
4. Draw project references and runtime boundaries; document decisions and migration triggers.
5. Verify with build, tests and dependency checks.

Keep facts, assumptions and decisions separate. See Microsoft's [common web application architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures).
