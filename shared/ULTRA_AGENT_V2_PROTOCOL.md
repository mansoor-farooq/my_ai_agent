# Ultra Agent v2 Runtime Protocol

Ultra Agent v2 is the local, project-scoped execution contract for the Mansoor Agent Hub. It makes the manager faster on repeat work without exporting credentials, hidden chain-of-thought, private chats or unrelated project data.

## Native agent activity and user approval

The production orchestrator's parent chat is the concise task activity log. Before native sub-agent delegation it identifies the selected workers, roles, bounded scopes, and expected outputs; at meaningful milestones it reports observed progress, blockers, and results. The Antigravity native sub-agent panel is the source for live worker states and detailed worker conversations. The standalone browser dashboard is retired because it only mirrored persisted task files and could not show live Antigravity work.

For material feature requests, reconstruct the selected project's current behavior and research current primary sources before proposing implementation. Present a cited brief with project contracts, competitor evidence, 2–3 options, trade-offs, risks, differentiation, and acceptance criteria; wait for explicit approval before editing product code. Routine bounded fixes remain on the fast path.

Memory remains isolated to the selected project's `.agents/memory/` directory. Validate project identity and freshness before reuse; never copy memory across projects or store credentials, raw chats, or hidden reasoning. Preserve project structure and existing contracts; broad restructuring requires its own proposal and approval. On quota limits, checkpoint and pause/resume using the platform's supported account rules; never rotate credentials to bypass a limit.
## Runtime loop

`BOOT → PREFLIGHT → MEMORY → RESEARCH → PLAN → BUILD → VERIFY → SYNC`

1. **BOOT** — identify the target repository, user scope and requested outcome.
2. **PREFLIGHT** — run `node tools/ultra-agent-v2/preflight.mjs --dir <repo> --project <name>` and inspect the JSON before choosing specialists.
3. **MEMORY** — run `node tools/ultra-agent-v2/memory.mjs init --dir <repo> --project <name>`. Read `.agents/memory/PROJECT_MEMORY.md` and the relevant map/decision notes before broad inspection.
4. **RESEARCH** — for current or uncertain claims, use bounded official/primary sources and record the claim with `evidence.mjs append --kind research`.
5. **PLAN** — select the smallest specialist set, preserve existing contracts and state the acceptance evidence.
6. **BUILD** — make the smallest coherent change. Keep credentials, customer data and unrelated files out of prompts and memory.
7. **VERIFY** — run targeted checks and record commands/results with `evidence.mjs append --kind verification`.
8. **SYNC** — append a concise change record. Use `tools/sync-knowledge-bank.mjs --push` only after explicit authorization and only for the approved project identity/branch.

## Local commands

```powershell
node tools/ultra-agent-v2/preflight.mjs --dir . --project my-project
node tools/ultra-agent-v2/memory.mjs init --dir . --project my-project
node tools/ultra-agent-v2/memory.mjs status --dir . --project my-project
node tools/ultra-agent-v2/evidence.mjs append --dir . --kind research --question "..." --claim "..." --source-url "https://..." --confidence verified
node tools/ultra-agent-v2/evidence.mjs append --dir . --kind verification --command "npm test" --result "..." --status pass
```

The tools are dependency-free Node.js ESM utilities and are included in the portable ZIP. They are local-first: a missing optional runtime integration is reported as a limitation, not silently replaced with invented success.

## Memory contract

The canonical project memory directory is `.agents/memory/`. It contains a compact project dossier, map, decisions, change log, open questions, research ledger and verification ledger. Memory is keyed by a stable project identity derived from the sanitized Git remote plus project slug, so unrelated projects do not share state.

Memory is an evidence cache, not a transcript archive. It may store verified contracts, file maps, decisions, commands and concise outcomes. It must not store credentials, private keys, customer PII, raw hidden reasoning or unrelated raw conversations.

## Evidence contract

Every ledger record has a stable ID, kind, timestamp, question/claim or command/result, confidence/status and optional source or independent check. Duplicate records are ignored. Secret-like values are redacted before writing. Research and verification remain separate so an unverified idea cannot be presented as a passing check.

## V3 task state and recovery

V3 task state is stored locally under `.agents/ultra-v3/tasks/<task-id>/`. The state utility records atomic JSONL events and a materialized `state.json`; each event carries task ID, project ID, actor, previous/next state and evidence references. Legal lifecycle states are `INTAKE`, `PREFLIGHT`, `CONTEXT`, `MODE`, `PLAN`, `DELEGATE`, `BUILD`, `VERIFY`, `EVALUATE`, `COMPLETE`, `PAUSED` and `RECOVERABLE_FAILURE`. A corrupt or semantically invalid tail is quarantined and rewritten from the last valid event during `resume`; state is never deleted to hide a failure. Task updates use a local lock so concurrent workers do not overwrite each other's events.

```powershell
node <hubRoot>/tools/ultra-agent-v3/state.mjs start --dir <project> --task task-001 --project my-project
node <hubRoot>/tools/ultra-agent-v3/state.mjs transition --dir <project> --task task-001 --to PREFLIGHT
node <hubRoot>/tools/ultra-agent-v3/state.mjs checkpoint --dir <project> --task task-001 --label before-build
node <hubRoot>/tools/ultra-agent-v3/state.mjs resume --dir <project> --task task-001
```

V3 traces are append-only JSONL records at `.agents/ultra-v3/traces/<task-id>.jsonl` with project ID and evidence references. Completion is accepted only when the mode-specific evidence threshold is met: Fast requires a passing targeted verification and command result; every Premium task requires a research-ledger record, and Premium high-risk work additionally requires an independent check. A failed command writes a durable resume checkpoint, returns `RECOVERABLE_FAILURE` and never deletes the task state.

## Safety and ownership boundaries

- The manager remains the only shipped main agent.
- Specialists inherit the host Antigravity/Gemini model and are selected by the manager.
- No credentials, MCP servers, provider bridges or hidden monitoring are bundled.
- Project sync is opt-in and scoped; local memory works without GitHub access.
- The package never exports hidden chain-of-thought. It records concise decisions and observable evidence only.


## PostgreSQL project RAG

## V4.3 adaptive runtime

The manager may use these additive control utilities after the V3 sequence:

```text
node <hubRoot>/tools/ultra-agent-v3/delegation.mjs plan --items <json>
node <hubRoot>/tools/ultra-agent-v3/policy.mjs check --action <action> --approved <true|false>
node <hubRoot>/tools/ultra-agent-v3/activity.mjs append --dir <repo> --project <name> --task <id> --type <event> --message "..."
node <hubRoot>/tools/ultra-agent-v4/benchmark.mjs record --dir <repo> --project <name> --task <id> --status <pass|fail> --latency-ms <n>
node <hubRoot>/tools/ultra-agent-v4/benchmark.mjs summary --dir <repo> --project <name>
node <hubRoot>/tools/ultra-agent-v4/recovery.mjs plan --dir <repo> --project <name> --failure-code <code> --attempt <n>
```

Delegation is dependency-safe and capped at three parallel workers. Specialists cannot recursively delegate. External, destructive and publish-like actions remain approval-gated. Recovery is targeted and bounded to two attempts; it must not become a broad rewrite loop. Metrics are project-local JSONL evidence and secrets are redacted before persistence.

The selected repository may maintain a project-scoped retrieval index in the local `mansoor_agent_rag` PostgreSQL database. Runtime access is through `tools/ultra-agent-v2/rag.mjs` and is bound to the V2 project identity. The runtime uses `localhost` by default, avoids a hard-coded IP and creates the configured database when the authenticated role permits it. Retrieval results must carry project ID, relative path, line range and source hash. The index excludes secrets, credentials, dependencies, binaries, raw chats and unrelated repositories. Missing or stale indexes are rebuilt before material feature work; retrieved text is evidence and must be checked against current source. PostgreSQL full-text search is the default; embeddings remain optional and provider-free.
