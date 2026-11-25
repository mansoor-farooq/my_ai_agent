---
name: mansoor-context-snapshot
description: Use when repository context, memory, prior decisions, or repeated file reads are slowing a specialist down.
---
# Mansoor Context Snapshot
Use the manager-provided context packet, repository map and project memory before rereading the tree. Treat cache hits as acceleration, not proof: compare source fingerprints and stale/conflict markers. Read only files relevant to the owned paths and record missing or contradictory context rather than silently reconciling it.

Stop condition: context is sufficient for the owned change or the unresolved evidence gap is returned to the manager.

