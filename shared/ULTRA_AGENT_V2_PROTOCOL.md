# Ultra Agent v2 Runtime Protocol

Ultra Agent v2 is the local, project-scoped execution contract for the Mansoor Agent Hub. It makes the manager faster on repeat work without exporting credentials, hidden chain-of-thought, private chats or unrelated project data.

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

## Safety and ownership boundaries

- The manager remains the only shipped main agent.
- Specialists inherit the host Antigravity/Gemini model and are selected by the manager.
- No credentials, MCP servers, provider bridges or hidden monitoring are bundled.
- Project sync is opt-in and scoped; local memory works without GitHub access.
- The package never exports hidden chain-of-thought. It records concise decisions and observable evidence only.
