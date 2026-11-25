---
name: mansoor-parallel-handoff
description: Use when work can be split across specialists, when a manager must merge independent reports, or when ownership may overlap.
---
# Mansoor Parallel Handoff
Split only independent chunks with disjoint write ownership; make read-only critics parallel by default. Give every worker the same context digest, contract, evidence schema and stop condition. Handoffs contain changed paths, findings, verification and unresolved risks—not a full transcript. Serialize overlapping or unknown ownership.

Stop condition: the manager has all required handoffs and an independent verification result.

