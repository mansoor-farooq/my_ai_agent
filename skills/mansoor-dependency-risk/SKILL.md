---
name: mansoor-dependency-risk
description: Use when a task adds, upgrades, imports, or relies on packages, repositories, APIs, browser runtimes, or external services.
---
# Mansoor Dependency Risk
Prefer existing project dependencies and maintained public sources. Record version, license, provenance, security signal, runtime need and rollback path before adoption. Avoid adding a dependency for a small local transformation. Treat network/API credentials and paid providers as explicit capability gaps.

Stop condition: dependency evidence and rollback boundary are recorded, or the dependency is rejected.

