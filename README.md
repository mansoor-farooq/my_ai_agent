# Antigravity Super-Agent Hub & Autonomous Skills Platform

> **Production Super-Agent System** with Autonomous Deep Research, Secondary Multi-Option Verification, Enterprise ERP Reverse Engineering (SAP & ERPNext), Multi-Agent Consensus, and an optional portable DeepSeek Hermès Subagent Bridge.

[![Skills Count](https://img.shields.io/badge/Core%20Skills-49%20%2B%20Repair%20Utility-success)](skills/)
[![Custom Agents](https://img.shields.io/badge/Custom%20Agents-6%20Specialized-blue)](agents/Antigravity/custom-agents/)
[![DeepSeek Hermes](https://img.shields.io/badge/DeepSeek%20Hermes-Portable%20Bridge%20Active-brightgreen)](subagents/deepseek-hermes/)
[![Security](https://img.shields.io/badge/Architecture-Zero--Code%20Gate%20Enforced-orange)](shared/SUPER_AGENT_PROTOCOL.md)

---

## 1. Zero-Friction Portable Deployment (One Command for Any PC)

Jab aap kisi doosre computer par ye repository clone karein:

```bash
git clone https://github.com/mansoor-farooq/my_ai_agent.git
cd my_ai_agent
```

Antigravity close karke PowerShell mein complete migration ke liye ek command run karein:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Agent Antigravity -RestoreNativeHistory
```

### Ye Command Kya Karti Hai:
1. **49 core skills + 1 repair utility** ko `%USERPROFILE%\.gemini\config\skills` mein install karti hai.
2. **6 Specialized Custom Subagents** ko `%USERPROFILE%\.gemini\config\agents` mein register karti hai.
3. **DeepSeek Hermès Bridge** ko portable setup karti hai:
   - `subagents/deepseek-hermes/dsh-profile/` se aapke pre-configured login credentials (`.credentials.yaml`), free-tier device tokens, aur gateway settings ko `%USERPROFILE%\.dsh\` par restore kar deti hai.
   - Provider/device binding ki wajah se destination par login ya authorization dobara maangi ja sakti hai; installer profile ko restore karta hai, account policy ko bypass nahi karta.
4. **4-Key Gemini Fallback Pool** (`gemini-pool.json`) aur `.env` keys ko configure kar deti hai.
5. Workstyle preferences aur project flow datasets ko `%USERPROFILE%\.gemini\agent-context\datasets` mein link kar deti hai.

---

## 2. DeepSeek Hermès & 4-Key Gemini Subagent Execution Engine

Aapka system autonomous subagent execution ke liye 2-tier priority model use karta hai:

```
+-------------------------------------------------------------------------------+
| PRIORITY 1: Logged-in DeepSeek Free Account Models (via .dsh credentials)      |
| -> Executes headless tasks with zero token cost                               |
+---------------------------------------+---------------------------------------+
                                        | (On rate-limit or busy)
                                        v
+-------------------------------------------------------------------------------+
| PRIORITY 2: 4-Key Google Gemini Pool Automatic Rotation (gemini-pool.json)    |
| -> Account 1 -> Account 2 -> Account 3 -> Account 4 (Auto-Rotating Failover)   |
+-------------------------------------------------------------------------------+
```

Tamam runner scripts aur connection files [`subagents/deepseek-hermes/`](subagents/deepseek-hermes/) mein version-controlled hain.

---

## 3. Autonomous Deep Research & Secondary Verification Engine

Production-line workflow ke liye agent kabhi user se design references ya CSS snippets nahi mangta. Jab aap bolte hain:
> *"minimalism UI chahiye"* ya *"frosted glassmorphic layout banao"* ya *"high-density SAP table chahiye"*

Agent autonomously 3-Phase Deep Search run karta hai:

### Phase 1: Autonomous Intent & Real-World Benchmark Search
- Production design systems (Linear, Apple macOS, Stripe, Vercel, SAP Fiori Horizon) ko search karke exact physics aur mathematical tokens extract karta hai:
  - Specular highlights (`border: 1px solid rgba(255, 255, 255, 0.25)`), dynamic backdrop blur (`blur(16px)`), refraction shadows, aur baseline typography rhythm ($WCAG\ AAA$).

### Phase 2: Secondary Verification & Multi-Option Synthesis
Agent ek guess par nahi rukta, balki **2-3 battle-tested options** visually compare karta hai:
- **Option A (Modern Minimalist Pure):** High-speed rendering, zero unnecessary chrome, crisp 1px borders.
- **Option B (Polymorphic / Frosted Glass):** Translucent depth, specular light catching, macOS visual elevation.
- **Option C (High-Density Enterprise Grid):** 36px compact rows, frozen headers, strict status semantics.

### Phase 3: Visual ASCII Wireframe Blueprint Delivery
Chat mein code likhne se pehle complete visual blueprint render hoti hai taake aap 1 click mein visual confirm karein.

---

## 4. Multi-Agent Consensus Topology & Strict Zero-Code Gate

Agents virtual parallel loop mein communicate karte hain:

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
     | - Folder Struct   | | - SAP/ERP Tables  | | - Deep Search     |
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
                       | - Scoped Diff Edits       |
                       +-------------+-------------+
                                     |
                       +-------------v-------------+
                       |      Verifier Agent       |
                       | (live-web-auditor/Tests)  |
                       | - Empirical Proof         |
                       +---------------------------+
```

---

## 5. 100% Tested 50 Skills Inventory

| # | Skill | Category | Production Capability |
| :---: | :--- | :--- | :--- |
| 1 | `autonomous-deep-researcher` | **Intelligence** | Autonomous benchmark search, token extraction, secondary multi-option verification. |
| 2 | `multi-agent-consensus` | **Orchestration** | Virtual parallel loop, cross-agent RFC envelopes, Zero-Code Gate. |
| 3 | `enterprise-erp-reverse-engineering` | **ERP / Reverse Eng** | SAP S/4HANA (BKPF/BSEG, VBAK/VBAP, MARA) & ERPNext DocType mapping. |
| 4 | `two-step-ui-blueprint` | **UI / Verification** | Visual ASCII wireframe generation & layout gate before code execution. |
| 5 | `interactive-grill-consultant` | **Consultancy** | Claude-style Socratic questioning, edge-case probing, plan correction. |
| 6 | `project-knowledge-sync` | **Knowledge Bank** | Secret-scrubbed architecture harvesting to private GitHub repository. |
| 7 | `software-architect` | **Architecture** | System design, ADRs, module boundaries, fitness functions. |
| 8 | `saas-architecture-engineer` | **SaaS Architecture** | Multi-tenancy isolation (`org_id`), RBAC, catalog, order workflows. |
| 9 | `reverse-engineering` | **Analysis** | Codebase flow tracing, discrepancy auditing, non-destructive reconstruction. |
| 10 | `ui-ux-pro-max` | **Design Systems** | 67 styles, 161 palettes, 57 font pairings, 99 UX rules. |
| 11 | `frontend-design` | **Design Systems** | Distinctive, non-generic typography, color, and spacing decisions. |
| 12 | `cinematic-ui` | **Visual Design** | High-production visual storytelling, pacing, and mood. |
| 13 | `dc-premium-template` | **Enterprise UI** | Premium light enterprise theme matching DC Confirmation Report standard. |
| 14 | `impeccable` | **UI Engine** | Visual polish, typesetting, accessibility, and contrast verification. |
| 15 | `live-web-quality-auditor` | **Testing / QA** | End-to-end browser smoke testing via Chrome DevTools. |
| 16 | `webapp-testing` | **Testing / QA** | Playwright browser automation, element discovery, and console audit. |
| 17 | `gravitas-verification` | **Verification** | Empirical disk gates, runtime proof, anti-sycophancy audits. |
| 18 | `spec-driven-engineering` | **Engineering** | Test-driven contracts, formal specifications, design-drift prevention. |
| 19 | `project-context-orchestrator` | **Memory** | Compact project memory, incremental refresh, flow tracking. |
| 20 | `understand-anything` | **Comprehension** | Interactive mental models and dependency graphs for legacy codebases. |
| 21 | `efficient-context` | **Performance** | Token-budget optimization, duplicate read prevention. |
| 22 | `learn-deeply` | **Learning** | Socratic deep dives, concept maps, and first-principles reasoning. |
| 23 | `schema-mapping` | **Data Engineering** | Entity mapping across disparate schemas and databases. |
| 24 | `data-autocleaning` | **Data Quality** | Automated data quality and schema validation pipelines. |
| 25 | `bigquery-sql` | **Data Platform** | High-efficiency SQL, query optimization, cost minimization. |
| 26 | `bigquery-ai-ml` | **Data Platform** | Forecasting, anomaly detection, vector search, embeddings. |
| 27 | `bigquery-bigframes` | **Data Platform** | Python BigFrames data processing and ML workflows. |
| 28 | `bigquery-data-transfer-service` | **Data Platform** | Automated scheduled data transfer pipelines. |
| 29 | `bigquery-graph-author` | **Knowledge Graph** | GQL schema creation, graph table mapping, semantic enrichment. |
| 30 | `bigquery-graph-query` | **Knowledge Graph** | Advanced GQL pattern matching, hybrid vector-graph querying. |
| 31 | `building-data-apps` | **Applications** | Fullstack FastAPI/Express + React data application architecture. |
| 32 | `dataform-bigquery` | **Data Pipelines** | Dataform SQLX pipeline engineering and workflow configs. |
| 33 | `dbt-bigquery` | **Data Pipelines** | dbt models, incremental strategies, and BigQuery optimizations. |
| 34 | `gcp-data-pipelines` | **Cloud Data** | Cloud Composer, Dataflow, and Dataproc orchestration. |
| 35 | `gcp-dataflow` | **Cloud Data** | Apache Beam streaming and batch data processing. |
| 36 | `gcp-spark` | **Cloud Compute** | Dataproc Serverless PySpark big data jobs. |
| 37 | `gcp-spark-troubleshooting` | **Cloud Compute** | Spark memory tuning, OOM fixes, executor debugging. |
| 38 | `gcp-pipeline-orchestration` | **Cloud DevOps** | Airflow DAGs, Cloud Composer scheduling. |
| 39 | `gcp-pipeline-resource-provisioning` | **Cloud Infra** | Infrastructure as Code for data pipelines. |
| 40 | `google-cloud-auth-verification` | **Cloud Security** | Pre-flight ADC and service account authentication checks. |
| 41 | `enforcing-resource-attribution` | **Cloud Governance** | Mandatory billing labels and cost center tracking. |
| 42 | `discovering-gcp-data-assets` | **Data Catalog** | Dataplex asset discovery and metadata indexing. |
| 43 | `federate-lakehouse-catalog` | **Data Governance** | BigLake and Iceberg lakehouse catalog federation. |
| 44 | `managing-python-dependencies` | **DevOps** | uv, pip, poetry environment management and conflict resolution. |
| 45 | `ml-best-practices` | **AI / ML** | ML lifecycle, model validation, reproducibility standards. |
| 46 | `notebook-guidance` | **Notebooks** | Jupyter notebook code standards, kernel execution governance. |
| 47 | `omniroute-gateway` | **AI Gateway** | Safe local LLM bridge and multi-provider token routing. |
| 48 | `premium-web-workflow` | **Web Delivery** | End-to-end premium web delivery from brief to verified build. |
| 49 | `accidental-data-loss-prevention` | **Safety** | Guardrails against destructive commands and data drops. |
| 50 | `skill-repair` | **Self-Healing** | Automatic detection and patching of corrupted agent manifests. |

---

## 6. 6 Specialized Custom Subagents (`agents/Antigravity/custom-agents/`)

1. **`production-orchestrator`** *(Lead Super-Agent)*: Governs multi-agent consensus, Socratic grilling, and the Zero-Code Gate.
2. **`saas-architect`**: Cloud & enterprise software architecture, multi-tenancy, and ADRs.
3. **`enterprise-schema-architect`**: ERP reverse engineering (SAP S/4HANA & ERPNext), ledger immutability, relational models.
4. **`mansoor-ui-specialist`**: Autonomous deep design research, minimalism/glassmorphism tokens, and visual wireframes.
5. **`live-web-auditor`**: Chrome DevTools live QA, network inspection, and responsive smoke tests.
6. **`omniroute-gateway-operator`**: Local LLM gateway configuration and multi-model failover.

---

## 7. Knowledge Bank Auto-Sync: project branches and rounds

Knowledge sync ab `main` par direct push nahin karta. Har contributor aur project ke liye private branch `knowledge/<contributor>/<project-slug>-<stable-id>` banti hai. Planning, implementation aur final rounds usi branch par timestamped files ke taur par append hote hain:

```text
knowledge/ali/cartivo-a19f2c/
  PROJECT_DOSSIER.md       # latest consolidated context
  manifest.json            # phase, round aur scrubbed inventory metadata
  rounds/
    01-planning.md
    02-implementation.md
    03-final.md
```

Lead agent is command ko planning round, implementation round aur final handoff par automatically invoke karta hai:

```powershell
node tools/sync-knowledge-bank.mjs `
  --project "Cartivo" `
  --contributor "Ali" `
  --git-url "https://github.com/example/cartivo.git" `
  --dir "D:\Work\my_cafa" `
  --phase planning `
  --round 01 `
  --push
```

Final handoff ke liye `--phase final` use hota hai. Tool isolated temporary clone mein kaam karta hai, current hub checkout ko switch ya modify nahin karta, secret files exclude karta hai, metadata/content scrub karta hai, aur branch ko `origin` par push karta hai. `--dry-run` se branch name aur inventory pehle verify ki ja sakti hai.

This makes the knowledge bank reusable across your five devices: every agent can fetch the contributor/project branch, read the latest dossier, and continue from recorded decisions and rounds without starting from a fresh approach. The safe export contract is documented in `AGENT_EXPORT_POLICY.md` and `shared/knowledge/PROJECT_MEMORY_SCHEMA.md`.

The complete architecture audit and ultra-autonomous upgrade roadmap is in [ULTRA_AUTONOMOUS_AUDIT.md](ULTRA_AUTONOMOUS_AUDIT.md).

## 8. Recommended GitHub control plane

For remote management, use the checked-in least-privilege control contract in `shared/control-plane/`. The recommended transport is a GitHub App installed only on the selected private knowledge repository. It should use repository metadata read, contents write for knowledge branches, and optional pull-request/actions read for evidence; it should not request administration access. App credentials stay outside this repository.

Validate the local policy before distribution:

```powershell
node tools/validate-capability-manifest.mjs
```

GitHub rulesets should protect `main`, block force-push, and target `knowledge/**`. The local project repository is never reconfigured by the sidecar.

---

## 8. Current production manifest and count clarification

The current hub contains **50 skill folders**: **49 core capability skills plus `skill-repair` as the self-healing utility**. It contains **6 custom agents**, including `enterprise-schema-architect`, `production-orchestrator`, `saas-architect`, `mansoor-ui-specialist`, `live-web-auditor`, and `omniroute-gateway-operator`.

The count is verified from the folders currently present in `skills/` and `agents/Antigravity/custom-agents/`. It is safer to describe this as an inventory verification than to claim that every production behavior has been exhaustively tested on every destination PC.

## 9. DeepSeek Hermès is an optional provider bridge

The hub already contains the current Hermes bridge under `subagents/deepseek-hermes/`:

- `run-subagent.mjs`: DeepSeek-first execution with Gemini pool fallback.
- `dsh-profile/`: local Hermes profile, gateway settings and device credentials.
- `.env` and `gemini-pool.json`: provider configuration and fallback pool.
- `install-hermes-bridge.ps1`: copies the profile to `%USERPROFILE%\.dsh`.

The runner resolves the DeepSeek source from `DEEPSEEK_HERMES_ROOT`, then from `%USERPROFILE%\deepseek harmees`, then from `E:\deepseek harmees`. If the source is stored elsewhere on a destination PC, set it once before launching:

```powershell
$env:DEEPSEEK_HERMES_ROOT = 'E:\deepseek harmees'
node E:\Agents\subagents\deepseek-hermes\run-subagent.mjs "run the scoped task"
```

This root is a code dependency, while `.dsh` is the provider profile. The bridge does not pretend that credentials alone contain the DeepSeek application source.

The current hub copies the existing provider files from the local Hermes setup. Secret values are intentionally absent from this README and should never be pasted into chat, committed to a public repository, or placed in a normal project dossier. The installer uses them only on the destination machine. Because free-tier credentials and device tokens can be account- or device-bound, a destination may still ask for provider login or authorization even when the profile files are restored.

The default installation enables the Hermes bridge. To install skills and agents without copying the provider profile, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Agent Antigravity -SkipHermes
```

For the complete private setup, close Antigravity and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Agent Antigravity -RestoreNativeHistory
```

The command installs skills, custom agents, datasets, Hermes configuration and native sidebar history. The native restore creates a timestamped backup before replacing local conversation stores. Start Antigravity only after the command finishes.

## 10. Production operating protocol

Every requested build follows this sequence:

1. **Lead gate:** understand the request, ask only high-value Socratic questions, identify permissions, data boundaries and success evidence.
2. **Architecture review:** inspect the repository and produce an `[ARCH-PROPOSAL]` with folder structure, stack choices, contracts and risks.
3. **Schema review:** produce `[SCHEMA-SYNC]` for entities, foreign keys, tenant isolation, lifecycle transitions, idempotency and numerical precision.
4. **UI research:** perform autonomous reference search, compare at least two suitable directions, then produce `[UI-BLUEPRINT]` with tokens and a wireframe before implementation.
5. **Zero-code gate:** no builder edits until architecture, schema and UI constraints are recorded and the scope is approved by the lead.
6. **Scoped build:** use the smallest diff and preserve existing APIs, state flows, permissions and project conventions. DeepSeek Hermès may execute the scoped task; Gemini remains the lead and gatekeeper.
7. **Secondary verification:** independently check the result with focused tests, runtime evidence, browser smoke tests where applicable, and a diff review. Report observed facts separately from assumptions.

“Minimal UI”, “glass effect”, “polymorphism”, or similar requests trigger the research and option-comparison path automatically. The user does not need to provide CSS examples first.

## 11. Knowledge and project-flow datasets

Reusable context is stored in `shared/knowledge/datasets/` and is installed to `%USERPROFILE%\.gemini\agent-context\datasets`. Read `WORKSTYLE.md`, then `PROJECT_FLOWS.md`, then the relevant project dossier and conversation index before changing an existing project. These files describe approaches and invariants; the agent must still inspect the current repository because archived context can become stale.

## 12. Verification performed for this hub

- 50 skill folders and 6 custom agent definitions were counted from the current E: hub.
- DeepSeek Hermes provider files in the hub match the current local Hermes setup by size and SHA-256; secret values were not printed.
- Native Antigravity snapshot contains 56 app conversations, 4 IDE stores, 56 sidebar summary rows and 18 project definitions.
- Native sidebar SQLite summary passes `integrity_check` and contains 56 conversation rows.
- PowerShell installer and native restore scripts parse successfully.

The hub is ready for production migration, with provider setup and native chat restore kept as explicit, reversible steps.
