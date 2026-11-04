---
name: memory
description: Persistent cross-session and cross-project memory skill. Saves and recalls architecture decisions, verified API contracts, debugging solutions, and user preferences instantly using SQLite vector memory and local .agents/memory dossiers to eliminate redundant file scans and save massive time.
author: Mansoor Farooq
source: Mansoor Agent Hub private global skill library
license: Proprietary - private distribution only
---

# Persistent Agent Memory Skill

This skill eliminates repetitive exploration, redundant scanning, and lost context across sessions. It turns the agent into an instant-recall engine, saving tokens, time, and API bandwidth.

## 1. Core Operating Principles

1. **Memory First, Never Blind Scan:**
   - At the start of every session or task, read `.agents/memory/PROJECT_MEMORY.md` first.
   - For semantic search across past solutions, call `ruflo`'s `memory_search` or `memory_retrieve`.
   - Never run broad file listings or re-read unchanged files that are already mapped in memory.

2. **Durable In-Flight Capturing:**
   - Whenever an important architecture decision, API endpoint contract, or tricky bug fix is resolved:
     - Record the finding in `.agents/memory/PROJECT_MEMORY.md`.
     - Upsert to ruflo persistent vector memory via `memory_store` with tags like `['project-slug', 'api', 'fix']`.

3. **Strict Zero-Loss & Zero-Leakage:**
   - Never store raw credentials, passwords, or customer PII in memory.
   - Store verified schemas, field shapes, endpoint paths, header keys, and architectural invariants.

---

## 2. Fast Recall Protocol

When the user asks to inspect, fix, or build a feature:
1. **Check Memory:** Check if the file path, endpoint, or widget structure is already recorded in `.agents/memory/PROJECT_MEMORY.md` or `memory_retrieve(key: ...)`.
2. **Targeted Read Only:** If found, jump directly to the target line range or file without reading the parent folder or full repository.
3. **Execute & Verify:** Make the minimal required modification and verify targeted test/analyzer.
4. **Update Memory:** Add 1-2 bullet points of what changed and verified to memory.

---

## 3. Persistent Memory Sync & Commands

- **Retrieve by keyword/concept:**
  Use MCP `ruflo:memory_search(query: "...")` or `ruflo:memory_retrieve(key: "...")`.
- **Save durable knowledge:**
  Use MCP `ruflo:memory_store(key: "youngs_bazar:catalog_api", value: "...", tags: ["youngs_bazar", "api"])`.
- **Project Dossier:**
  Ensure `.agents/memory/PROJECT_MEMORY.md` stays current with:
  - Active verified endpoints & tokens required.
  - State management patterns.
  - Resolved bugs and edge cases.
