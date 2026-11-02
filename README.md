# Antigravity Multi-Agent Hub & Autonomous Skills Platform

> Autonomous Lead + Specialized Subagents with Socratic Requirement Hardening, Multi-Agent Consensus, Enterprise ERP (SAP / ERPNext) Reverse Engineering, Two-Step Visual Wireframe Blueprints, and Cross-Project Knowledge Harvesting.

---

## 1. Quick Start: One Command for Any Antigravity Setup

Open PowerShell in this folder (`E:\Agents`) and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Agent Antigravity
```

This single command:
1. Installs all 49+ specialized global skills directly into `%USERPROFILE%\.gemini\config\skills`.
2. Registers the 6 custom subagents into `%USERPROFILE%\.gemini\config\agents`.
3. Sets up project flow datasets and workstyle patterns into `%USERPROFILE%\.gemini\agent-context\datasets`.
4. Configures instructions in `%USERPROFILE%\.gemini\GEMINI.md`.

---

## 2. Multi-Agent Consensus & Virtual Collaboration Topology

Specialized agents operate in a parallel virtual loop, exchanging proposals and enforcing a strict **Zero-Code Architecture Gate** before any implementation:

```
                      +-----------------------------+
                      |   Lead Orchestrator (Gemini)|
                      |    - User Interaction       |
                      |    - Socratic Interrogation |
                      |    - Safety & Gate Enforcer |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                     |                     |
     +---------v---------+ +---------v---------+ +---------v---------+
     | Architecture Lead | | Enterprise Schema | |   UI Specialist   |
     | (saas-architect)  | | (ERP / DB Expert) | | (Mansoor UI Spec) |
     | - Folder Struct   | | - SAP/ERP Tables  | | - Two-Step Search |
     | - Library Stack   | | - Foreign Keys    | | - Visual Wireframe|
     | - ADR Contracts   | | - Ledger Balance  | | - Responsive Grid |
     +---------+---------+ +---------+---------+ +---------+---------+
               |                     |                     |
               +---------------------+---------------------+
                                     |
                         [ ZERO-CODE GATE: LOCKED ]
                                     |
                       +-------------v-------------+
                       |    Scoped Builder Agent   |
                       | (DeepSeek/Gemini Subagent)|
                       | - Minimal Diff Edits      |
                       +-------------+-------------+
                                     |
                       +-------------v-------------+
                       |      Verifier Agent       |
                       | (live-web-auditor/Tests)  |
                       | - Empirical Proof         |
                       +---------------------------+
```

---

## 3. Specialized Custom Agents (`agents/Antigravity/custom-agents/`)

1. **`production-orchestrator`**:
   - Master Lead Agent. Coordinates multi-agent consensus, handles interactive user grilling, enforces the Zero-Code Gate, and coordinates Builders and Verifiers.
2. **`saas-architect`**:
   - Senior Architecture Reviewer. Defines bounded contexts, multi-tenant isolation (`organization_id`), modern library selection via verified searches, and ADRs.
3. **`enterprise-schema-architect`** *(New)*:
   - ERP & Relational Database Specialist. Benchmarks domain models against SAP S/4HANA (`BKPF`/`BSEG`, `VBAK`/`VBAP`, `MARA`) and ERPNext (`DocTypes`, `GL Entry`, `Stock Ledger Entry`). Enforces immutable double-entry ledger logic and idempotency.
4. **`mansoor-ui-specialist`**:
   - Product UI & Design-Systems Specialist. Executes Two-Step searches and outputs visual wireframe blueprints before touching any frontend code.
5. **`live-web-auditor`**:
   - Live smoke testing and verification agent. Evaluates running web applications via Chrome DevTools without mutating production state.
6. **`omniroute-gateway-operator`**:
   - Manages local LLM gateways and API bridges safely.

---

## 4. Key Advanced Skills (`skills/`)

- **`interactive-grill-consultant`**:
  - Claude-style consultative questioning. Relentlessly interrogates vague requirements, challenges assumptions, suggests corrected battle-tested architectures, and demands explicit confirmation before planning.
- **`multi-agent-consensus`**:
  - Governs virtual parallel loops (`[ARCH-PROPOSAL]` -> `[SCHEMA-SYNC]` -> `[UI-BLUEPRINT]`). Stops speculative code generation until all contracts are locked.
- **`enterprise-erp-reverse-engineering`**:
  - Reference blueprints for SAP FI/SD/MM/PP and ERPNext. Provides standard database table schemas, foreign key structures, and transactional lifecycle invariants.
- **`two-step-ui-blueprint`**:
  - Prohibits generating UI code blindly. Forces the agent to output an ASCII wireframe or Mermaid layout spec for user visual verification before code generation.
- **`project-knowledge-sync`**:
  - Harvests sanitized architectural patterns, schemas, and blueprints at the end of projects and syncs them to your private GitHub repository (`my_ai_agent`).

---

## 5. Tools & Knowledge Synchronization

### Cross-Project Knowledge Harvester (`tools/sync-knowledge-bank.mjs`)
When concluding work on a client project, extract sanitized architectural insights without leaking secrets:

```bash
# Harvest and save local sanitized dossier
node tools/sync-knowledge-bank.mjs --project "acme-erp" --dir "C:\Projects\acme-erp"

# Harvest and automatically push to private GitHub repo
node tools/sync-knowledge-bank.mjs --project "acme-erp" --dir "C:\Projects\acme-erp" --push
```

---

## 6. Repository Layout

- `skills/`: 49+ self-contained, plain-text Antigravity skills.
- `agents/Antigravity/custom-agents/`: Source custom agent definitions.
- `tools/`: Node.js utilities for history snapshotting and cross-project knowledge harvesting.
- `shared/knowledge/datasets/`: Workstyle preferences, project flows, and sanitized project dossiers.
