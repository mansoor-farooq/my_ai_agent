# Ultra Agent V4.4 Hardening and Native Activity Design

## Intent

Upgrade the shipped V4.3 runtime into a more observable and recoverable V4.4 without changing the manager, project identity, PostgreSQL contract, specialist routing, or native Antigravity activity boundary.

## Goals

- Make evaluation outcomes directly convertible into redacted benchmark records.
- Add checkpoint file-hash manifests and read-only drift verification.
- Make memory status report useful health counts for current, stale, unversioned and conflicting evidence.
- Add a deterministic native activity task summary for parent-chat updates.
- Keep native Antigravity profile dumps and private backups outside project RAG retrieval.
- Keep all new behavior local, provider-free, additive and backward-compatible.

## Non-goals and anti-goals

- No automatic Git reset, rollback, publish, account rotation or provider switching.
- No standalone browser dashboard revival.
- No neural model, network dependency or database migration in this wave.
- No project-wide restructure or change to existing routes, IDs, permissions or specialist ownership.

## Approach

Use small Node.js ESM utilities and additive CLI actions. Evaluation exposes a sanitized metric envelope that the manager can persist through the existing benchmark ledger. State checkpoints record hashes only for explicitly supplied owned paths; verification compares current hashes and reports drift without modifying files. Memory status derives bounded health counts from the local ledgers. Activity summary reads the existing append-only JSONL and emits a concise timeline/parent update.

## Acceptance

- Evaluation metric output contains task, project, mode, outcome, duration and acceptance checks with secrets redacted.
- A checkpoint with owned paths detects modified, deleted and missing paths; no source content is stored.
- Memory status reports counts and does not promote unversioned evidence.
- Activity summary reports assignment, latest state, blockers, changed paths and checks deterministically.
- RAG source filters exclude native-profile/private-backup trees while preserving ordinary source files.
- Existing V4.3 tests remain green; package remains provider-free and signed.
