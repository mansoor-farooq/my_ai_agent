---
name: production-code-quality
description: Use when implementing or reviewing production code that needs clear module boundaries, maintainable functions, useful documentation, safe error handling, or a clean reviewable change.
---

# Production Code Quality

Write code that another engineer can change safely. “Clean” means the structure exposes intent, contracts and failure behavior; it does not mean adding ceremony, comments or abstractions everywhere.

## Working standard

1. Follow repository conventions and current framework documentation. Inspect callers, contracts, data flow and error handling before changing a function.
2. Keep functions cohesive and scoped to one understandable job. Name values and operations by domain intent. Extract abstractions only when they reduce real coupling or repetition.
3. Document public APIs and non-obvious functions with the language's native form (JSDoc/TSDoc, Python docstrings, XML docs, or the repo convention). State purpose, important inputs/constraints, return behavior, side effects and errors callers must handle. Add examples only when ambiguity warrants them.
4. Add inline comments for rationale, invariants, compatibility constraints or non-obvious safety decisions. Do not narrate obvious syntax or duplicate the function name; stale comments are defects.
5. Make errors actionable without exposing secrets or internals. Preserve context when rethrowing, use typed/domain errors where established, and avoid swallowing failures or returning success-shaped defaults.
6. Validate trust-boundary inputs; preserve authorization and tenant checks near protected operations. Avoid leaking secrets/PII through logs or exceptions.
7. Add focused tests for changed behavior and failure cases when the task asks for tests or the repository workflow requires them. Do not claim tests or production readiness without observed evidence.
8. Review the diff for accidental scope, duplicated logic, unused dependencies, dead code, accessibility/performance regressions in UI changes, and docs that drift from behavior.

## Comment decision

Before adding a comment, ask: “Does this explain why, an invariant, a contract, or a non-obvious consequence that the code itself cannot show?” If not, improve the code or remove the comment.

## Review output

Summarize changed boundaries, contract/documentation updates, actual verification commands and results, unresolved risks, and rollback notes. Separate observed evidence from assumptions.
