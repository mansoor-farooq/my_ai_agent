# Reconstruction Checklist

Use only the sections relevant to the current request. Keep the final report short enough that another engineer can act on it.

## Project map

- [ ] Read repository instructions and identify the allowed scope.
- [ ] Identify language, framework, package manager, build targets, and runtime versions.
- [ ] Locate entry points, routing, state ownership, service boundaries, persistence, and generated code.
- [ ] Record the narrow commands for build, lint, type-check, tests, and local reproduction.

## Flow trace

- [ ] Name the initiating event and its input shape.
- [ ] Trace validation, normalization, defaults, and authorization.
- [ ] Trace state/cache/database writes and invalidation.
- [ ] Trace each network or process boundary, including headers, payloads, response parsing, retries, and idempotency.
- [ ] Trace loading, success, empty, error, offline, cancellation, and retry UI/result states.
- [ ] Check platform-specific behavior and text-scale/accessibility constraints for mobile UI.

## Contract audit

| Area | Verify |
| --- | --- |
| IDs | Internal ID vs display ID; variant vs product; tenant/org scope |
| Data | Type, nullability, units, rounding, timezone, ordering |
| API | Method, URL, headers, payload, status codes, error envelope |
| State | Ownership, lifetime, cache key, invalidation, session switching |
| Security | Auth, authorization, secret handling, logging/redaction |
| Reliability | Timeout, retry, duplicate submission, unknown result, rollback |

## Static-analysis evidence graphs

Use REA, decompiler, and call-graph exports to find likely code paths; they are navigation evidence, not proof that a path is complete or executes at runtime.

- Record the target artifact's product/build, format, size, and SHA-256, plus the analyzer version and relevant options. Normalize local paths in any tracked notes. If the target artifact is unavailable or its digest differs, label freshness **Unverified**.
- Read the report's coverage, truncation, omitted-count, parser-warning, and unsupported-feature fields before relying on its graph. A `partial` or unknown coverage result limits every conclusion drawn from that graph.
- Trace only the graph path relevant to the user's behavior: entry point/input → validation and state → process/network/database effect → output. Check each important node and edge against the exact source location or bundle entry; then corroborate the path with a caller/callee, test, log, request, or runtime observation.
- Label graph-only claims **Strong inference** until independently corroborated. Report unavailable or contradictory evidence as **Unverified**; node and edge counts describe report size, not correctness.
- Keep the raw report and analyzed binary outside the skill package and Git by default. They may contain machine-specific paths or source-derived material, and are tied to one build. Add only a small sanitized, reproducible fixture when it is needed for a test and its contents are approved for redistribution.

## Findings template

```text
Finding: <observable issue>
Evidence: <file/symbol/test/log/request>
Classification: Observed | Strong inference | Unverified
Impact: <user, data, security, performance, or maintenance impact>
Next check: <cheapest observation that would confirm or reject it>
```

## Change verification

- [ ] Add or update a focused regression check if the behavior is testable.
- [ ] Run the narrowest relevant checks, then the project-required suite/build.
- [ ] Inspect the diff for unrelated edits, generated-file churn, secrets, and formatting noise.
- [ ] Report commands, results, limitations, and any live-service/device checks that were not possible.
