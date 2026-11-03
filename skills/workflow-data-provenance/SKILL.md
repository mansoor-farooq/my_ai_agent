---
name: workflow-data-provenance
description: Use when workflow results, operational dashboards, AI summaries, decisions, or reports must be traceable to real source records and transformations.
---

# Workflow Data Provenance

Make displayed facts explainable and reproducible.

## Provenance map

For every important output, record source system/table/API, record ID or scoped reference, observed-at time, workflow/run ID, transformation/version and data freshness. Preserve source lineage through retries and subflows without copying unnecessary personal data.

Use explicit freshness and missing-data states. Distinguish `not found`, `not configured`, `stale`, `permission denied` and `failed to fetch`; never replace them with invented values. For AI-generated summaries, link back to allowed source records and mark generated interpretation separately from source facts. Add retention and deletion behavior for provenance records.

Verify one output end to end from source through transformations to UI/API, including access control and tenant isolation.
