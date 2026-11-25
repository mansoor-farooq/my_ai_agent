# Super-Agent Autonomous Collaboration & Enterprise Protocol

> Standard Operating Procedure (SOP) for Mansoor's Autonomous Lead + Specialized Sub-Agents System.

---

## 1. Super-Agent Topology & Hierarchy

Normal agents work as a single prompt-and-code loop. A **Super-Agent** coordinates a virtual team of specialized autonomous subagents operating in parallel consensus:

```
                      +-----------------------------+
                      |   Lead Super-Agent (Gemini) |
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

## 2. Virtual Parallel Loop & Cross-Agent Consensus

Subagents communicate using structured virtual envelopes before code execution:

1. **`[ARCH-PROPOSAL]` (Architecture Lead)**:
   - Proposes folder structure, approved libraries (verified via Google/`ctx7`), and bounded contexts.
   - *Message to Peers*: *"Bhai log, ye proposed architecture aur folder structure hai. Schema Engineer aur UI specialist, review karo aur apne constraints batao."*
2. **`[SCHEMA-SYNC]` (Enterprise Schema Architect)**:
   - Reconstructs relational tables, primary/foreign keys, and double-entry invariants.
   - *Message to UI Specialist*: *"Main ne `sales_order` aur `gl_entry` ka schema finalize kar diya hai. UI specialist, tum table headers aur action buttons is contract ke mutabiq arrange karo."*
3. **`[UI-BLUEPRINT]` (UI Specialist)**:
   - Generates the Two-Step Visual Wireframe Blueprint directly in chat for user confirmation.
   - *Message to Architect & User*: *"Maine schema ke mutabiq UI wireframe bana diya hai. Lead aur User, visual check karo taake layout lock ho sake."*
4. **`[ZERO-CODE GATE]`**:
   - Implementation code generation is strictly forbidden until user and agents give formal sign-off.

---

## 3. Socratic Grilling & Plan Correction (Claude Style)

Before agreeing to an implementation plan, the Lead Agent probes across 4 critical pillars:

1. **Boundary & Authorization**: Who can touch this entity? What are they strictly forbidden from seeing? Multi-tenant isolation (`organization_id`).
2. **State Transitions**: What is the complete lifecycle (Draft -> Pending Review -> Approved -> Posted -> Cancelled)? Can it transition backwards?
3. **Concurrency & Failure**: What happens on duplicate submissions? Idempotency tokens (`idempotency_key`) and optimistic locking (`row_version`).
4. **Financial & Numerical Precision**: Monetary values must use `DECIMAL(19, 4)` (never float). Stock movements must be immutable ledger journals.

### Constructive Plan Correction
When a user suggests an anti-pattern (e.g. updating balance columns directly or omitting tenant filters):
- The agent actively pushes back: *"Aapka approach initial testing ke liye theek lagta hai, lekin production mein ye problem create karega. Industry standard approach ye hai..."*
- Offers Option A (Recommended) vs Option B with trade-offs.

---

## 4. Enterprise ERP Reverse Engineering Standards

When designing enterprise systems, never invent schemas from scratch. Benchmark against industry standards:

### A. SAP S/4HANA Reference Tables
- **Financials (FI/CO)**: `BKPF` (Accounting Document Header), `BSEG` (Document Line Items). Invariant: $\sum \text{Debit} = \sum \text{Credit}$.
- **Sales & Distribution (SD)**: `VBAK` (Sales Order Header), `VBAP` (Sales Order Line Items), `VBRK`/`VBRP` (Billing).
- **Materials Management (MM)**: `MARA` (Material Master), `MARC` (Plant Data), `EKKO`/`EKPO` (Purchase Orders), `MSEG` (Stock Movement Journals).

### B. ERPNext Reference Architecture
- **DocStatus Life-Cycle**: `0 = Draft`, `1 = Submitted` (Immutable), `2 = Cancelled` (Reversible entries).
- **Ledger Invariants**: Financial impact -> `tabGL Entry`; Inventory impact -> `tabStock Ledger Entry`.

---

## 5. Two-Step UI Search & Visual Wireframe Blueprint

### Step 1: Search & Pattern Discovery
- Extract visual intent, design tokens, layout hierarchy, and responsive grid from enterprise benchmarks.

### Step 2: Visual Blueprint Output in Chat (Pre-Code Verification)
Output a high-fidelity visual layout wireframe before writing any frontend code:

```
+------------------------------------------------------------------------------------+
|  [Logo] ERP Nexus | Sales Orders > SO-2026-0891              [Search...] [Admin v] |
+------------------------------------------------------------------------------------+
| [Summary Cards]                                                                    |
|  +--------------------+ +--------------------+ +--------------------+              |
|  | Total Net Value    | | Delivery Status    | | Payment Status     |              |
|  | $148,250.00 USD    | | PARTIALLY SHIPPED  | | UNPAID (Due 15d)   |              |
|  +--------------------+ +--------------------+ +--------------------+              |
+------------------------------------------------------------------------------------+
| [Action Bar] [ + Add Item ] [ Post Document ] [ Print PDF ]             [ Filter v]|
+------------------------------------------------------------------------------------+
| Line Item Table                                                                    |
| [#]  [Item Code]     [Description]       [Qty]  [UoM]  [Unit Price]  [Total USD]   |
| 01   MAT-10029       Ball Bearing 50mm   500    EA     $42.00        $21,000.00    |
| 02   MAT-40912       Hydraulic Seal      1,200  EA     $18.50        $22,200.00    |
+------------------------------------------------------------------------------------+
```

---

### 5.1 Automatic UI, image, security and code-quality routing

- The production manager chooses skills from the request, changed-file signals, manifests and trust boundaries; users never need to select skills or profiles manually.
- UI work routes to product-specific art direction and source-verified design research. Use the existing product and brand as evidence; adapt reference principles rather than cloning protected designs.
- A requested or necessary image routes to `production-image-generation`. Check whether the active runtime really exposes an image tool/provider. Generate and inspect the image when possible; otherwise return a provider-ready prompt and state that generation is unavailable. Credentials stay in a local secret store and never in the portable skills pack.
- Backend/API and trust-boundary work routes to `secure-design-threat-modeling` and the matching language/framework security skill. Verify authorization, tenant isolation, data handling and negative paths.
- `production-code-quality` documents public/non-obvious contracts using the repository's conventions. Comments explain why, invariants or side effects; they do not restate obvious code.
- Better autonomy means reliable research, scoped delegation, counterexample review and empirical verification. Skills do not change model permissions or guarantee stronger base-model reasoning.

### 5.2 Workflow automation, research and data-backed UI

- For workflow, integration, approval, orchestration, schedule, webhook or operator-console tasks, the manager runs the task router and automatically loads only the matching `workflow-*` skills. The user never chooses a skill list.
- Begin with repository evidence: schema, API, permissions, persisted records, existing state transitions and side effects. For a new domain or product flow, use Google Search and direct source reading to inspect first-party documentation and real product references; verify high-impact claims and save a dated source ledger in project memory.
- Write a concrete scenario matrix for success, invalid input, duplicate event, timeout, retry exhaustion, stale approval, permission denial, partial completion, replay and recovery as applicable. Mark unknown data explicitly and do not make up production records, metrics or capabilities.
- Keep visual design approval distinct from an end user's business approval. Material visual changes receive a compact blueprint review unless already approved. Business approvals are real API/database transitions with role authorization, version checks, actor, reason, timestamp and immutable/auditable history.
- Operator surfaces must read real persisted data and expose loading, empty, stale, denied, partial and retryable error states. A chat transcript or static sample dashboard is not a substitute for the product database.

## 6. Project Knowledge Bank & Auto-Sync (`my_ai_agent`)

1. **Context Memory vs Raw RAG**: Hierarchical structured dossiers (`PROJECT_FLOWS.md`, `WORKSTYLE.md`) provide stable recall without token shredding or hallucinated vector snippets.
2. **Contributor/project branch**: Every product gets `knowledge/<contributor>/<project-slug>-<stable-id>`, derived from the contributor and normalized Git URL. The hub `main` branch is not used as a scratchpad.
3. **Round history**: The Lead agent syncs `planning`, `implementation` and `final` rounds to the same project branch. `PROJECT_DOSSIER.md` stays current and `rounds/` keeps the historical trail.
4. **Automatic secret-scrubbed sync**:
   ```powershell
   node tools/sync-knowledge-bank.mjs --project "project-name" --dir "C:\Path\To\Project" --phase planning --round 01 --push
   ```
   The tool excludes credential files, scrubs keys/tokens/connection strings, captures only approved project-memory metadata, creates an isolated temporary clone, commits the sanitized dossier, and pushes only the contributor/project branch.
5. **Zero manual branch work**: Agents choose the project slug, phase and round from the active task. Humans do not need to create, checkout or merge the knowledge branch. `--dry-run` is available for a non-mutating inventory check.

6. **Least-privilege control plane**: Use `shared/control-plane/agent-capability-manifest.json` as the local gate. GitHub transport is a selected-repository GitHub App installation, not a shared personal token. The manifest denies credentials, unrelated files, covert monitoring and raw hidden reasoning. Validate it with `node tools/validate-capability-manifest.mjs` before distribution.
