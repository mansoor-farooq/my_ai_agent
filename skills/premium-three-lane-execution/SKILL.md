---
name: premium-three-lane-execution
description: Use for complex work that benefits from a fast implementation lane, an independent quality/research lane, and a manager convergence barrier.
---

# Premium Three-Lane Execution

This is a coordination topology, not a second manager. Mansoor AI Team Manager remains the only dispatcher and owner of the final result.

## The three lanes

1. **Fast lane** — one primary specialist owns the implementation or primary investigation and produces a patch summary, changed paths, checks and gaps.
2. **Quality lane** — a different specialist works read-only against the shared intake digest. It researches current guidance, checks risk and acceptance criteria, and cannot modify the builder's paths.
3. **Manager lane** — the main manager joins both results, deduplicates evidence, runs the independent verification gate and decides whether an exact reviewed patch may be promoted.

The first two lanes may start together. The manager lane starts only after both required handoffs arrive. A missing or incomplete handoff is a blocked result, not an implicit pass.

## Context efficiency

Read project identity, toolchain, relevant memory, request, changed paths and acceptance criteria once. Pass a compact `mansoor.shared-context-digest/v1` to both lanes, then send only deltas: the builder's patch summary and the critic's evidence-backed findings. Do not make every worker reread the whole repository or transcript.

## Chunking rules

- Create chunks from real domains, path ownership or acceptance boundaries; never create fake work to fill workers.
- Keep one writer per path. Read-only chunks can overlap safely.
- Cap active native workers at three; the manager lane is a convergence phase and normally does not consume a fourth worker.
- Keep small reversible one-file fixes on the fast path. Use managed isolation when parallel writers, long checks, risk or an explicit testing branch makes it beneficial.

## Evidence contract

Every lane returns status, scope, findings, changes, checks, gaps and handoff. The manager reports observed evidence separately from assumptions, preserves conflicts, allows at most two targeted repairs, and never claims bug-free, browser-passed, CI-passed or speedup results without fresh evidence.
