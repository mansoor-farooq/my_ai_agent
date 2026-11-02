---
name: project-knowledge-sync
description: Cross-project knowledge harvesting, sanitization, and GitHub sync skill. Extracts architecture patterns, schemas, blueprints, and ADRs from client projects without leaking secrets, and syncs them to your private agent knowledge bank repository.
---

# Cross-Project Knowledge Harvesting & GitHub Sync

Use this skill when concluding a project phase, capturing architectural learnings, or synchronizing project memory back into your central private knowledge hub (`my_ai_agent`).

## Core Philosophy

1. **Zero Secret Leakage** — Client secrets, passwords, live API keys, customer PII, and proprietary IP must NEVER be exported. Only sanitized architecture patterns, schemas, UI blueprints, and design invariants are extracted.
2. **Context Memory over Heavy RAG** — For coding agents, compact hierarchical dossiers (`PROJECT_FLOWS.md`, `WORKSTYLE.md`, `SCHEMAS.md`) provide deterministic, 100% accurate recall without the hallucinations, chunk fragmentation, and server overhead of vector RAG.
3. **Automated Dossier Harvesting** — Summarize architectural breakthroughs into reusable project dossiers and push them back to your private GitHub repository so all your future agent sessions benefit from the collective intelligence.

---

## 1. What Gets Harvested

When harvesting knowledge from a project:

| Category | What to Extract | Redaction / Sanitization Rule |
| :--- | :--- | :--- |
| **Architecture** | Folder structure, chosen libraries, rationale, ADRs | Remove company proprietary names; use generic names |
| **Database Schema**| Relational tables, foreign keys, indexes, invariants | Redact seed data, customer credentials, connection strings |
| **UI Blueprints** | Layout wireframes, responsive grids, color tokens | Retain design system; remove proprietary logos/branding |
| **Domain Logic** | State machines, validation rules, ledger formulas | Keep mathematical and business logic intact |

---

## 2. The Harvesting Protocol

```
1. SCAN: Inspect project memory, architecture notes, and recent ADRs.
2. SANITIZE: Run secret and PII scrubbers (regex for keys, bearer tokens, passwords).
3. COMPOSE: Create a structured markdown dossier:
   - Project Type (e.g. Flutter ERP, SaaS Multi-Tenant, Next.js Portal)
   - Architecture Stack & Justification
   - Core Schemas & Entity Relationships
   - Key Bugs Solved & Lessons Learned
4. SYNC: Run `node tools/sync-knowledge-bank.mjs --project ... --contributor ... --git-url ... --dir ... --phase ... --round ... --push` to commit and push only the contributor/project knowledge branch in your private knowledge repo.
```

---

## 3. Tool Execution

Run the bundled sync tool from your agents hub:

```bash
node tools/sync-knowledge-bank.mjs --project "project-slug" --contributor "contributor-name" --git-url "https://github.com/org/project.git" --dir "C:\Path\To\ClientProject" --phase planning --round 01 --push
```

The script excludes credential files, scrubs secrets, captures approved project-memory files such as `PLAN.md`, `FLOW.md`, `DECISIONS.md`, `EVIDENCE.md`, `RESEARCH.md` and `PROMPT_LEDGER.md`, creates a consolidated dossier plus a round snapshot under `shared/knowledge/project-branches/<contributor>/<project-slug>-<stable-id>/`, and pushes only that contributor/project branch. Use `--phase implementation` and `--phase final` for later rounds; use `--dry-run` before a push when needed. Raw hidden reasoning, credentials and unrelated data are never part of the export contract.

Before distribution, validate `shared/control-plane/agent-capability-manifest.json`. The recommended GitHub transport is a selected-repository GitHub App installation with short-lived installation tokens; never put an App private key or shared personal token in the hub.
