---
name: gravitas-verification
description: Rigorous verification-first engineering skill. Enforces empirical proof, disk gates, anti-sycophancy audits, and real runtime validation before claiming completion.
---

# Gravitas & Deglaze Verification Engine

Prevents premature "done" claims, false assurances, and stubbed implementations. Operates on the principle: **Disk gates > vibes. Proof before completion.**

## Verification Invariants
1. **Never Assume — Run & Verify:**
   - Always run the relevant unit tests, compilation checks, or runtime probes before reporting a task complete.
   - For database changes, verify row counts, constraints, and data integrity directly in the database.
   - For UI changes, verify that the rendered components respond properly, endpoints return 200 OK, and edge cases are handled.
2. **Anti-Sycophancy & Self-Critique (Deglaze Protocol):**
   - Objectively state what has been implemented vs. what remains out of scope or unhandled.
   - Never say code is "tested and working perfectly" unless terminal outputs or test assertions verify it.
   - Highlight potential edge cases (concurrency, network drops, empty inputs, null pointers).
3. **Regression Prevention:**
   - Before completing refactors, verify that adjacent functionality has not been broken.
