---
name: spec-driven-engineering
description: Specification-driven engineering, TDD, and invariant contract validation skill. Prevents design-to-implementation drift by formalizing specifications, test cases, and edge cases up-front.
---

# Spec-Driven Engineering & TDD

Formalizes requirements into executable test suites and structural contracts before writing implementation code. Prevents drift, regression, and undefined behaviors.

## The Spec-Driven Lifecycle
1. **Spec & Contract Definition:**
   - Define exact API request/response schemas, status codes, and error formats.
   - Specify state transition machines (e.g. Order Status: `DRAFT` &rarr; `SUBMITTED` &rarr; `APPROVED` &rarr; `DISPATCHED`).
2. **Red-Green-Refactor Protocol:**
   - Author targeted unit/integration tests that fail prior to feature implementation.
   - Implement the minimum code necessary to make the tests pass.
   - Refactor for performance, readability, and token efficiency while keeping tests green.
3. **Invariant & Boundary Auditing:**
   - Verify boundary conditions: Null inputs, zero quantities, duplicate transactions, race conditions, and negative numbers.
