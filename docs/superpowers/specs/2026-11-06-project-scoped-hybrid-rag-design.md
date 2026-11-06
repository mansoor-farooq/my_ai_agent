# Project-Scoped Hybrid RAG Design

## Intent

Give every selected project its own searchable retrieval index so the Mansoor Agent Team can recover relevant architecture, contracts, decisions, research and verified change notes without mixing projects or loading the entire repository into every prompt.

## Goals

- Build a local, deterministic retrieval index in the PostgreSQL database `mansoor_agent_rag`, scoped by the selected project identity.
- Keep project identity bound to the existing V2 memory identity (`projectId`, project slug and Git/local origin).
- Exclude secrets, credentials, binary data, `.git`, dependencies, raw chats and unrelated projects.
- Return ranked snippets with path, line range, content hash, project ID and freshness metadata.
- Support `build`, `query`, and `status` commands without external services or API keys.
- Leave a clean adapter boundary for optional embeddings later; embeddings are not required for the first release.
- Integrate retrieval into the manager's project preflight and post-change refresh flow.

## Non-goals

- No global cross-project index.
- No cloud vector database, provider connector, OAuth flow or API-key routing.
- No whole-project restructure or automatic code changes based only on retrieved text.
- No storage of hidden reasoning, raw customer data, credentials or full chat transcripts.

## Data contract

RAG rows live only in the local PostgreSQL database `mansoor_agent_rag`, under `rag.projects` and `rag.documents`. Every document row records `projectId`, normalized relative path, start/end lines, source SHA-256, content and a PostgreSQL full-text vector. Query results never cross-checkout or cross-project boundaries.

## Local connection and bootstrap

The runtime uses the local hostname `localhost` by default and does not hard-code a loopback IP. It reads the local PostgreSQL credential through the user's pgpass/credential mechanism; when the configured database is missing and that credential has database-creation permission, the runtime creates `mansoor_agent_rag` automatically before applying the schema. `RAG_DB_HOST`, `RAG_DB_PORT`, `RAG_DB_USER` and `RAG_DB_NAME` remain optional overrides.

## Retrieval behavior

The first implementation uses PostgreSQL full-text scoring with `tsvector`/`tsquery`, stable path/line ordering and project-ID filtering. It returns the top `k` chunks above a minimum score, with stable ordering by score then path/line. A future embeddings adapter can write an optional sidecar and reuse the same result contract.

## Manager behavior

At project intake, the manager runs RAG status and builds or refreshes the index when missing or stale. Before a material change it queries the user's task plus the affected symbols/paths and includes only the top relevant snippets in worker handoffs. After a material change it refreshes affected files. Routine bounded fixes may use a targeted query without a full rebuild.

## Acceptance criteria

- Two projects with similar files produce different project IDs and cannot retrieve each other's chunks.
- Secret-like values and excluded paths never enter the index.
- Incremental rebuild keeps unchanged source hashes and refreshes changed files.
- Query results are deterministic and include evidence metadata.
- Missing, corrupt or stale indexes fail closed with a clear status and can be rebuilt.
- Existing V2 memory/evidence tests remain green and package validation remains provider-free.
