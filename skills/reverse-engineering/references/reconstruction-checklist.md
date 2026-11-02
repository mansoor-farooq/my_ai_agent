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
