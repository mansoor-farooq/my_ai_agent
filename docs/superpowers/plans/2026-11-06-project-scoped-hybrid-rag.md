# Project-Scoped Hybrid RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a project-isolated retrieval layer that improves every Mansoor agent without mixing repositories or requiring an external embedding provider.

**Architecture:** Add one focused CLI runtime (`tools/ultra-agent-v2/rag.mjs`) beside the existing memory/evidence utilities. It owns deterministic indexing, redaction, incremental PostgreSQL refreshes and full-text retrieval; the existing V2 memory identity remains the source of project identity. The manager invokes status/query/refresh through the installed hub path, while an optional future embeddings adapter can consume the same chunk/result contract without changing project files or routing.

**Tech Stack:** Node.js ESM, built-in `fs`, `crypto` and pure JavaScript source enumeration; PostgreSQL 17 full-text search through the local `psql` client on `localhost`, automatic database bootstrap when credentials permit it, JSON output, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-06-project-scoped-hybrid-rag-design.md`

## Global Constraints

- Keep RAG rows in the local PostgreSQL database `mansoor_agent_rag`, schema `rag`, and bind every operation to the selected project ID.
- Do not hard-code a loopback IP. Use `localhost` by default and create the configured database automatically when the authenticated PostgreSQL role permits it.
- Bind every manifest, chunk and result to the selected V2 `projectId`; never merge projects.
- Exclude secrets, credentials, binaries, `.git`, dependencies, raw chats and unrelated projects.
- Do not add MCP servers, OAuth, provider bridges, API-key routing or mandatory network access.
- Preserve existing routes, APIs, business logic, memory/evidence contracts and package dashboard behavior.
- Do not claim semantic embeddings; the first release is deterministic PostgreSQL full-text retrieval with an optional provider-free adapter boundary.

## Review Focus

- Similar files from two projects — query must return only the selected project (Task 2 test).
- Secret-like text and ignored paths — neither may be indexed (Task 2 test).
- Changed and deleted files — incremental rebuild must refresh/remove chunks without stale results (Task 2 test).
- Corrupt or stale manifest — status must fail closed and rebuild must repair it (Task 2 test).
- Empty/ambiguous queries — return a stable empty result instead of arbitrary files (Task 2 test).

---

### Task 1: Define the RAG contract with failing tests

**Files:**
- Create: `tools/tests/project-rag.test.mjs`
- Modify: `build-agent-hub.ps1` to include the focused RAG test

**Interfaces:**
- Consumes: approved design spec and existing V2 project identity conventions.
- Produces: executable assertions for `rag.mjs build|status|query`, project isolation, redaction, incremental refresh, deterministic ranking and corruption handling.

- [x] **Step 1: Write failing CLI contract tests**
  - Create disposable projects with manifests and text files.
  - Assert `build` writes the three RAG files and a manifest containing the expected project ID.
  - Assert `query` returns path, line range, score, project ID and source hash.
  - Assert excluded paths and secret-like values are absent.
  - Assert a second project cannot be queried through the first project's index.
  - Assert changing/deleting a file updates/removes its chunks.
  - Assert corrupt manifest status is `stale`/invalid and rebuild repairs it.

- [x] **Step 2: Run the focused test to verify RED**

Run: `node --test tools/tests/project-rag.test.mjs`
Expected: FAIL because `tools/ultra-agent-v2/rag.mjs` does not exist.

### Task 2: Implement deterministic project-scoped PostgreSQL RAG

**Files:**
- Create: `tools/ultra-agent-v2/rag.mjs`
- Modify: `tools/ultra-agent-v2/memory.mjs` only if a small exported identity helper is needed; preserve its CLI behavior.

**Interfaces:**
- CLI: `node rag.mjs build|status|query --dir PATH --project NAME [--q TEXT] [--top K] [--max-chars N]`.
- `build` refreshes `rag.projects` and `rag.documents` in the local `mansoor_agent_rag` database and returns counts.
- `status` reads readiness and chunk counts for the selected project identity.
- `query` uses PostgreSQL `tsvector`/`plainto_tsquery` and returns path, line range, score, content, source hash and project ID.
- Future embedding adapters may consume the same chunk/result contract, but this task must not add a dependency or provider call.

- [x] **Step 1: Implement project identity and safe source enumeration**
  - Reuse the V2 slug/Git/local identity convention.
  - Enumerate only readable text files under the project, skip `.git`, `.agents/rag`, dependency/build/cache directories and binary/oversized files.
  - Apply the existing secret redaction pattern before indexing; skip chunks that become empty.

- [x] **Step 2: Implement chunking and incremental manifest**
  - Chunk by bounded line windows with path/heading metadata.
  - Store SHA-256 source hashes and rewrite only changed files; remove deleted-file chunks.
  - Write atomically and keep malformed partial files from becoming a ready index.

- [x] **Step 3: Implement deterministic PostgreSQL full-text scoring**
  - Normalize query and chunk tokens, calculate TF-IDF-like scores, add small path/heading boosts, sort by score then path/line, and cap `top`/text size.
  - Reject project ID mismatches and return an empty result for blank/stopword-only queries.

- [x] **Step 4: Run focused tests to verify GREEN**

Run: `node --test tools/tests/project-rag.test.mjs`
Expected: all RAG contract tests PASS.

### Task 3: Integrate RAG into the production manager contract

**Files:**
- Modify: `agents/Antigravity/custom-agents/production-orchestrator/agent.md`
- Modify: `shared/ULTRA_AGENT_V2_PROTOCOL.md`
- Modify: `tools/build-antigravity-plugin.mjs` to package `tools/ultra-agent-v2/rag.mjs`
- Modify: `tools/tests/agent-routing.test.mjs` or the focused routing test file that owns manager utility assertions

**Interfaces:**
- Consumes: Task 2 CLI contract.
- Produces: manager instructions that run RAG status/build/query only for the selected project and report retrieved evidence paths; no cross-project or hidden-data retrieval.

- [x] **Step 1: Add a failing manager integration assertion**
  - Assert the manager profile names `rag.mjs`, selected-project scoping, pre-task query, post-change refresh and evidence metadata.

- [x] **Step 2: Run the routing test to verify RED**

Run: `node --test tools/tests/agent-routing.test.mjs`
Expected: FAIL because the manager has no RAG contract.

- [x] **Step 3: Add the manager/protocol RAG contract**
  - At intake: run `rag.mjs status`, build if missing/stale, then query the task and affected symbols.
  - Include only top relevant snippets with path/line/hash metadata in handoffs.
  - Refresh affected files after material changes; never index raw prompts, hidden reasoning, credentials or unrelated projects.
  - Keep routine fixes on the fast path and leave embedding providers optional.

- [x] **Step 4: Run the routing test to verify GREEN**

Run: `node --test tools/tests/agent-routing.test.mjs`
Expected: PASS.

### Task 4: Package, document and verify the RAG release

**Files:**
- Modify: `package.json` version to `1.7.1`
- Modify: `tools/tests/portable-plugin-contents.test.mjs`
- Modify: `docs/superpowers/plans/2026-11-06-project-scoped-hybrid-rag.md` with execution status
- Modify: `README.md` generated package copy text if needed

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: signed `dist/mansoor-agent-hub.zip` with RAG runtime and tests; the obsolete standalone browser dashboard is no longer packaged.

- [x] **Step 1: Add package-content assertions**
  - Assert `tools/ultra-agent-v2/rag.mjs` is present in the ZIP and no provider connector is added.

- [x] **Step 2: Run the full build**

Run: `npm run build`
Expected: strict plugin validation PASS, doctor 0 failures/warnings, all focused tests PASS, signed ZIP emitted.

- [x] **Step 3: Inspect release evidence**
  - Verify ZIP SHA-256, package version `1.7.1`, RAG runtime presence, and `git diff --check`.
  - Record that the package is built but not installed; native UI acceptance remains a separate gate.

- [ ] **Step 4: Commit**

```bash
git add tools/ultra-agent-v2/rag.mjs tools/tests/project-rag.test.mjs tools/tests/portable-plugin-contents.test.mjs agents/Antigravity/custom-agents/production-orchestrator/agent.md shared/ULTRA_AGENT_V2_PROTOCOL.md tools/build-antigravity-plugin.mjs build-agent-hub.ps1 package.json docs/superpowers/specs/2026-11-06-project-scoped-hybrid-rag-design.md docs/superpowers/plans/2026-11-06-project-scoped-hybrid-rag.md
git commit -m "feat: add project-scoped hybrid retrieval"
```

## Execution status (2026-11-06)

- PostgreSQL 17 on the local `localhost` connection was verified; `mansoor_agent_rag`/`rag` is ready, pgpass authentication contains no IP-specific entry, and the runtime now bootstraps a missing database when credentials permit it without placing the password in source, package or memory.
- `E:\Agents` was indexed successfully: 12,293 safe text files and 14,893 chunks; status is ready and project-scoped query returned evidence with path/line/hash metadata.
- Dedicated RAG tests pass 3/3: project isolation and secret/dependency exclusion, changed/deleted refresh, and blank-query behavior.
- Release `1.7.1` is rebuilt after the standalone browser dashboard retirement and localhost database bootstrap change: strict validation passed, doctor reported 0 failures/0 warnings, and the dedicated RAG run passed 5/5 tests.
- ZIP is built at `E:\Agents\dist\mansoor-agent-hub.zip` and is not installed. Native Antigravity parent-chat activity remains the live sub-agent view; V3 task files remain only for recovery/evidence.
