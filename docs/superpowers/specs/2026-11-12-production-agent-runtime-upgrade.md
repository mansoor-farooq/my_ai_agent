# Production Agent Runtime Upgrade Design

## Goal

Turn Ultra Agent's existing policy, lifecycle, memory, evidence, benchmark, and release utilities into a verifiable execution lane for Antigravity, without replacing the 15-profile team, changing project APIs, or claiming quality that has not been measured.

## Research-backed choices

- **Separate policy from approval.** Antigravity documents OS-level command sandboxing, file/network permission rules, and a `Deny > Ask > Allow` precedence. A sandbox boundary and an approval decision are separate controls. On Windows hosts where sandboxing is unavailable, the product must report review-required behavior rather than claim sandbox enforcement. Sources: [Antigravity permissions](https://antigravity.google/docs/permissions), [Antigravity sandbox](https://antigravity.google/docs/cli/sandbox?app=antigravity), [Codex sandboxing](https://developers.openai.com/codex/concepts/sandboxing).
- **Run repeatable repository tasks.** OpenHands' benchmark harness uses pinned SDK/image compatibility and isolated workspaces; SWE-bench binds tasks to real repository issues and reproducible evaluation images. Source: [OpenHands benchmarks](https://github.com/OpenHands/benchmarks), [SWE-bench](https://github.com/SWE-bench/SWE-bench).
- **Use compact structural context.** Aider ranks a dependency graph to fit high-value symbols into a context budget rather than loading the whole repository. Source: [Aider repo map](https://aider.chat/docs/repomap.html).
- **Make retries deterministic.** Temporal documents deterministic workflows and idempotent or non-retryable side effects. Existing effect receipts will be wired to execution and covered for duplicate/replay behavior. Source: [Temporal architecture](https://github.com/temporalio/temporal/blob/main/docs/architecture/README.md).
- **Use defense-in-depth.** OpenHands describes Docker/remote sandboxes and explicitly labels process mode as lacking container isolation. GitHub recommends least-privilege workflow permissions and immutable SHA pinning for third-party actions. Sources: [OpenHands sandboxes](https://docs.openhands.dev/openhands/usage/sandboxes/overview), [GitHub Actions hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions).

No competitor source code will be copied. The project will reuse design patterns only, retain its Node.js ESM/no-new-dependency constraint, and preserve existing Antigravity APIs, profile IDs, global customization handling, and project business logic.

## Current-state findings

- `tools/ultra-agent-v4/core-loop.mjs` implements a dependency-injected lifecycle, but no shipped runtime invokes `runCoreLoop`; tests are its only caller.
- `tools/rule-governance.mjs` resolves and checks rule metadata, but the resolver is not used on a task/tool-call path.
- Benchmark utilities accept result records, but no owner-reviewed repository task corpus is checked in; the existing CLI cannot execute model tasks.
- Six PostgreSQL integration tests are skipped by the normal cross-platform suite unless enabled. The dedicated gate exists, but no checked-in CI workflow invokes it.
- The Antigravity manager uses a native host runtime. A custom Node wrapper only enforces actions routed through it. The plugin's PreToolUse hook separately denies protected/out-of-workspace native mutations and requires fresh review for in-workspace writes and shell commands. Native effects remain outside the Node effect ledger.

## Design

1. Add a managed execution adapter which takes an explicit task, approved plan, concrete actions, command-check registry, and dependencies. It must run the existing lifecycle, rule resolution, exact write checks, effect receipts, local trace/checkpoint records, command verification, and final evidence in one path.
2. Keep the adapter fail-closed: missing host approval, invalid policy, missing required check, path escape, unsupported action, or failed checkpoint stops the run. Writes are atomic and idempotent by task/action/payload hash. Shell execution is never accepted as a model-authored arbitrary command; checks must come from a registered command list and run with `shell: false`.
3. Add benchmark schema and report validation for agent/profile version, model/config identity, base revision, task ID, repeat index, acceptance, tests, regression, unsafe action, latency, optional observed cost, and reviewer disposition. Draft cases are not counted as owner-approved benchmark evidence. Do not manufacture results or assert competitor superiority.
4. Add a first-party task-fixture format and red-team fixture set for authorization, path traversal, symlink, secret paths, malicious repository text, policy bypass, duplicate effects, interruption/resume, missing tool, and failed verification. Fixtures run against the real managed adapter.
5. Add CI with two jobs: Windows runs the complete node:test suite, doctor, and secret scan; Linux runs PostgreSQL RAG integration against an ephemeral dedicated `mansoor_agent_rag_test` service and fails if required RAG tests skip. Workflow token permissions are read-only and third-party actions are SHA pinned.
6. Extend installer/update verification so tests exercise missing, unchanged, managed-update, and locally customized rule files; ensure the local file is preserved and an update report identifies the changed package version/hashes. No personal Antigravity settings are silently changed.
7. Add an Antigravity runtime capability report and manager instructions: state when sandbox is unavailable, use request-review mode, package a PreToolUse hook for native mutations and commands, and state that native effects are outside the Node ledger. Keep Windows 11 platform support separate from probed sandbox status.

## Acceptance

- A complete happy-path task runs through the managed adapter and returns path-, check-, approval-, trace-, and revision-bound evidence.
- Denied writes, unapproved execution, missing rule/check, policy mismatch, injection fixture, failed checkpoint, and unsafe action never return `complete` and cause no file side effect.
- Replaying the same write does not duplicate or alter the side effect; changed payload under an existing effect key is rejected.
- Benchmark aggregation rejects incomplete, unpinned, duplicate, draft, or unreviewed records; reports per-agent and per-task-type results without invented cost values.
- The RAG CI job runs the six PostgreSQL integration tests with zero skips on an isolated database.
- Installer integration tests prove both normal refresh and local-customization preservation.
- Existing `npm test` and doctor remain green; no new runtime dependency; no unrelated project APIs/routes/permissions/business logic changed.

## Limits

- Gemini/Antigravity live benchmark runs require the owner account and quota; this implementation builds the harness and policy gates, not fabricated model scores.
- Competitor product comparisons are evidence sources for architecture, not like-for-like score claims.
- Host-native IDE writes are governed by Antigravity's settings, not by Node code unless routed through the managed adapter. The product must state this boundary plainly.
