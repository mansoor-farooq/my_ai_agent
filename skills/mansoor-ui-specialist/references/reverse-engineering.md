# Reverse-engineering reference for UI work

Use this before changing an existing page or copying a reference interaction. The purpose is to understand the real system, not to refactor it.

## Evidence order

1. Read `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, build files, and contribution rules.
2. Map the stack, entry points, routes, dependency injection, environment loading, persistence, external services, and test surfaces.
3. Search symbol references before reading whole files. Trace one flow end to end:
   `user event -> view/component -> state/validation -> controller/service -> API/database -> response mapping -> rendered state`.
4. Verify both sides of each contract: field names, types, IDs versus display values, nullability, date/time zones, pagination, ordering, status values, error envelopes, and permissions.
5. Record side effects, retries, caching, cleanup, and failure paths. Do not execute destructive actions or probe external services without authorization.

## Findings format

For every important conclusion, label it:

- **Observed** — directly confirmed in source, test, runtime output, or a request/response.
- **Strong inference** — supported by multiple independent signals but not directly observed.
- **Unverified** — plausible but requiring a test, log, fixture, or user confirmation.

Report a compact map such as:

`route -> view -> event -> controller -> service/repository -> API/database -> model -> UI state`

Keep secrets and raw customer data redacted. Use exact file/symbol references where possible.

## Safe reference copying

When a user provides a screenshot or another page as reference:

- Copy the visual intent and interaction pattern, not unverified markup or business assumptions.
- First compare the reference with the target's actual contracts and states.
- Preserve target route, IDs, model binding, validation, permissions, API/database calls, and action semantics.
- Record what is copied, what is adapted, and what cannot be copied because the target lacks equivalent data or behavior.
- Verify the result at desktop and mobile sizes, then build the affected project.

## Stop conditions

Stop and report an unknown instead of guessing when the change depends on an undocumented API field, database column, permission, route, credential, production state, or external service response.
