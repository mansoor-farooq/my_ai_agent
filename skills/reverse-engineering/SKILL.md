---
name: reverse-engineering
description: >-
  Reconstruct an existing software project before changing it: map architecture, trace real data and control flow, identify hidden contracts and inconsistencies, and verify fixes with evidence.
  Use automatically for existing Flutter/mobile apps, unfamiliar repositories, legacy systems, debugging, audits, integrations, or behavior that differs from documentation.
---

# Reverse Engineering Workflow

Use this skill for authorized analysis of an existing software project. The goal is a defensible model of how the system actually behaves, followed by the smallest safe change when the user asks for implementation.

## Operating principles

- Treat the repository and runtime behavior as evidence. Treat comments, plans, screenshots, generated files, and API examples as hypotheses until verified.
- Read project instructions first (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, contribution guides, build scripts, and CI configuration). Preserve their scope and the user's requested boundaries.
- Do not refactor, rename, reformat, migrate, or “clean up” during an analysis-only request.
- Never guess an API, package, permission, schema field, route, or config key. Find it in manifests, lock files, generated clients, server code, tests, or an observed request/response.
- Keep facts, inferences, and unknowns separate. Use confidence labels when authorship, intent, or undocumented behavior is uncertain.
- Do not expose secrets, tokens, personal data, or proprietary source in reports. Redact values while preserving names, types, and relationships.

## Choose the smallest useful mode

1. **Orientation** — map the stack, entry points, build/run commands, major modules, persistence, external services, and test surfaces.
2. **Flow trace** — follow one feature end to end from UI/CLI/event through state, validation, network/database calls, and rendered/result state.
3. **Discrepancy audit** — compare actual behavior with docs, API contracts, screenshots, logs, tests, and configuration; report the exact contradiction and evidence.
4. **Change impact** — before editing, identify callers, consumers, state transitions, data migrations, platform differences, and failure paths that can be affected.
5. **Safe reconstruction** — for a user-authorized fix, write a small hypothesis, add or update a focused regression check when appropriate, implement only the needed change, and re-run verification.

## Investigation sequence
### Context-memory handoff

When `project-context-orchestrator` is available, read the project memory before
broad repository exploration. Validate its revision, branch, manifests, and
working-tree diff; refresh only the affected flow when it is current. Rebuild
stale or contradictory sections before making decisions. Keep the evidence
labels and redaction rules from that skill, and update the affected memory
sections after verification. For Flutter/mobile tasks, hand off UI-specific
work to the available Flutter UI skill instead of duplicating its playbook.

### 1. Establish the boundary

Write down the requested behavior, what must remain unchanged, and the observable success condition. Identify whether the task is read-only, a reversible code change, or an external/destructive action. Ask only when missing information would change the safe implementation.

### 2. Build the project map

Inspect, in this order when present:

- repository instructions and workspace layout;
- package manifests and lock files;
- app/server entry points, routing, dependency injection, and environment loading;
- domain models, state stores, repositories, API clients, database migrations, and background jobs;
- tests, fixtures, mocks, generated code, and CI/build scripts.

Record a compact map: `entry point -> feature/module -> state/service -> data source -> output`, plus platform-specific branches.

### 3. Trace the real flow

Search symbol references before reading whole files. For the target behavior, follow:

- inputs and validation;
- state creation, persistence, cache keys, and invalidation;
- transformations and default values;
- network/database boundaries, headers, payloads, status/error handling;
- side effects, retries, idempotency, permissions, and cleanup;
- UI/result rendering and loading, empty, error, and offline states.

Use runtime logs, a local fixture, a narrow test, or a request recorder when static code cannot answer a question. Prefer read-only instrumentation. Do not bypass authentication, authorization, licensing, encryption, rate limits, or other access controls.

### 4. Check contracts and contradictions

For every important external or persistent contract, verify both directions: what the caller sends and what the consumer expects. Check field names and types, nullability, units, time zones, IDs versus display values, pagination, ordering, version/deprecation status, and error envelopes. Mark each conclusion as **Observed**, **Strong inference**, or **Unverified**.

### 5. Produce a useful result

For an analysis, report:

- architecture and stack map;
- traced flow with file/symbol references;
- confirmed contracts and invariants;
- inconsistencies, dead paths, risky coupling, and missing tests;
- unknowns and the cheapest next observation;
- prioritized recommendations tied to user impact and regression risk.

For an implementation, keep the same map in the change notes, preserve unrelated behavior, and include verification evidence. If a live service, credential, device, or platform is unavailable, state that limitation instead of simulating success.

## Evidence standard

A finding is stronger when it is supported by at least two independent signals (for example, a call site plus a test, or a manifest plus a runtime request). Quote only the smallest relevant snippet. Use exact file paths and line numbers where available. Do not label code as AI-generated or human-authored from style alone; describe observable quality or provenance signals instead.

## Safety boundaries

This skill is for systems the user owns or is authorized to inspect. It supports interoperability, debugging, migration, security review, and maintenance. Stop and ask before probing a third-party service, extracting credentials or private data, modifying production state, defeating a protection mechanism, or performing irreversible cleanup. Keep any generated notes outside the source tree unless the user requests a tracked artifact.

For a focused checklist, read [references/reconstruction-checklist.md](references/reconstruction-checklist.md).



