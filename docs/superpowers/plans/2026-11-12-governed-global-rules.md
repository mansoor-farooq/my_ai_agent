# Governed Global Rules Implementation Plan

**Goal:** Make the four Antigravity rules versioned, scoped, conflict-aware, testable, and safely synchronized while preserving local edits.

**Architecture:** Keep Antigravity-compatible Markdown rules, add a signed JSON registry for metadata and precedence, and compile matching rule metadata into the existing deterministic Node policy runtime. Installer sync will use hash-based drift reporting and preserve customized global rule files.

**Tech Stack:** Node.js ESM, JSON, PowerShell installer, `node:test`; no added dependencies.

## Flow

```text
Read registry + project/task context
→ resolve applicable rules (security > global > project; higher priority first)
→ enforce runtime action checks
→ run rule-specific verification requirements
→ installer compares packaged and global rule hashes
→ copy unchanged/missing rules, preserve customized rules, report conflicts
```

## Acceptance Test Cases

1. Invalid or duplicate rule IDs, missing metadata, and bad hashes fail registry validation.
2. Security priority outranks architecture; project scope takes precedence over global; irrelevant task/project rules are omitted.
3. Existing tool action guards still deny unauthorized delegation, unapproved writes, destructive commands, and external side effects.
4. Installer copies a missing rule and refreshes a rule that still matches its prior managed hash.
5. Installer preserves a locally edited global rule, reports its path and source hashes, and does not silently overwrite it.
6. Rule registry, package signature, doctor, and release tests validate together.
7. Actual owner-machine installation reports all four rules and confirms no unintended rule drift.

## Implementation Tasks

1. Add `shared/control-plane/rule-registry.json` with stable IDs, versions, priority, scopes, owner, supersession, content hashes, applicable agents, required evidence, and verification commands.
2. Add `tools/rule-governance.mjs` for registry validation, deterministic applicable-rule resolution, and rule content hash checks. Extend existing `policy.mjs` with explicit security invariants; preserve its current public action behavior.
3. Add failing tests for registry validation, precedence, relevance filtering, and existing hard guards; then implement the governance module.
4. Update signed installer to sync global rules using packaged content plus local managed-hash state, preserving user customizations and reporting `RULE TARGET`, `RULE UPDATED`, `RULE PRESERVED`, or `RULE CONFLICT`.
5. Update doctor, package tests, README/quickstart, checksums, build and install; inspect installed registry/rule hashes and global customization report.

## Review Focus

- Windows path quoting and PowerShell edition compatibility: exercise installer-generation assertions and a real install.
- User-edited global rules: verify byte-for-byte preservation and explicit conflict reporting.
- Missing or malformed registry entry: doctor and installer must fail closed.
- Task/project context absent: only mandatory global security rules apply.
- Rule update with unchanged body but incremented registry version: avoid needless file replacement; report metadata update only.
