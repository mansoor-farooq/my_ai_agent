---
name: mansoor-product-gap-evidence
description: Use when analyzing a product or system for missing workflows, roles, permissions, operational capabilities, or differences from a reference implementation.
---

# Mansoor Product Gap Evidence

Separate what exists today from what a reference system, stakeholder or proposed design suggests.

1. Map current user-visible and backend flows from repository evidence: actor, trigger, states, permissions, data changes, integrations and failure paths.
2. Mark inspected routes/modules and uninspected scope; samples do not establish full-system coverage.
3. For each gap, show current evidence, expected behavior/source, affected roles, operational impact and confidence.
4. Compare references by exact version, source path and license; treat their flows as evidence/inspiration, not proof that the target needs the same design.
5. Prioritize by user impact, security/data risk, frequency and implementation dependency. Keep recommendations separate from confirmed defects.
6. Derive acceptance cases for happy, denied, retry, duplicate, stale, partial-failure and recovery states where they apply.

## Stop condition

Each reported gap is traceable to current-state and expected-state evidence or is labeled as a hypothesis, with scope and validation needs stated.
