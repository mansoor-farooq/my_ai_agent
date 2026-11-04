---
name: multi-agent-consensus
description: Autonomous multi-agent consensus and virtual parallel collaboration engine. Coordinates Lead Orchestrator, Architecture Lead, Enterprise Schema Engineer, UI Specialist, and Verifiers in an interactive virtual loop with a strict Zero-Code Gate before implementation.
---

# Multi-Agent Consensus & Virtual Collaboration Engine

Use this skill whenever running multi-agent tasks, cross-cutting features, enterprise system developments, or complex refactors involving multiple specialized agents.

## Core Philosophy

1. **Virtual Loop Consensus** — Specialized agents do not work in isolated silos; they operate in a continuous virtual loop, exchanging proposals, reviewing each other's contracts, and reaching consensus before writing code.
2. **Architecture-First Zero-Code Gate** — Under NO circumstances shall UI components, backend routes, or database code be generated until the Architecture Lead and Enterprise Schema Engineer have locked the technical specification and the user has approved it.
3. **Live Transparent Chat Updates** — The Lead Agent continuously reports progress to the user in Roman Urdu, announcing agent handoffs, consensus agreements, and verification proofs.

---

## 1. Agent Topology & Specialization Roles

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
                       | (Gemini Specialist Team) |
                       | - Minimal Diff Edits      |
                       +-------------+-------------+
                                     |
                       +-------------v-------------+
                       |      Verifier Agent       |
                       | (QA/Release Specialist)   |
                       | - Empirical Proof         |
                       +---------------------------+
```

---

## 2. Cross-Agent Consensus Protocol

Agents communicate using structured virtual envelopes:

### Envelope 1: Architecture RFC (`[ARCH-PROPOSAL]`)
- **Sender**: Architecture Lead
- **Payload**: Proposed folder structure, chosen libraries (verified via Google/ctx7), bounded contexts, and explicit use-case matrix.
- **Message to Peers**: *"Bhai log, ye proposed architecture aur folder structure hai. Schema Engineer aur UI specialist, review karo aur apne constraints batao."*

### Envelope 2: Schema Invariant Review (`[SCHEMA-SYNC]`)
- **Sender**: Enterprise Schema Engineer
- **Payload**: Relational tables, SAP/ERPNext reference mappings, primary/foreign keys, double-entry ledger invariants, and idempotency tokens.
- **Message to UI Specialist**: *"Main ne `sales_order` aur `gl_entry` ka schema finalize kar diya hai. UI specialist, tum table headers aur action buttons is contract ke mutabiq arrange karo."*

### Envelope 3: Visual Blueprint Verification (`[UI-BLUEPRINT]`)
- **Sender**: UI Specialist
- **Payload**: ASCII/Mermaid wireframe, responsive behavior, action triggers.
- **Message to Architect & User**: *"Maine schema ke mutabiq UI wireframe bana diya hai. Lead aur User, visual check karo taake layout lock ho sake."*

---

## 3. The 4 Golden Consensus Invariants

1. **No Speculative Code**: A builder agent that writes code before `[ARCH-LOCKED]` is flagged for invariant violation and stopped.
2. **Library Validation**: Every third-party package must be validated for license, active maintenance, and exact syntax via `ctx7` or official documentation.
3. **Single Source of Truth**: Data contracts live in the shared architecture specification (`docs/architecture/` or memory dossier), never duplicated independently in client and server code.
4. **Empirical Verification**: No task is closed with "should work". It must be tested via live command, test runner, or browser devtools.
