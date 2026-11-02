# MANSOOR · AGENT OS

<p align="center">
  <strong>PRIVATE ENGINEERING INTELLIGENCE</strong><br>
  <sub>Research deeply. Understand the system. Build with evidence.</sub>
</p>

<p align="center">
  <code>DISCOVER</code> &nbsp; ◆ &nbsp; <code>RESEARCH</code> &nbsp; ◆ &nbsp; <code>PLAN</code> &nbsp; ◆ &nbsp; <code>BUILD</code> &nbsp; ◆ &nbsp; <code>VERIFY</code>
</p>

---

> A private, multi-agent engineering workspace for turning a clear brief into researched plans, careful implementation, and verifiable outcomes.

<p align="center">
<a href="skills/"><img src="https://img.shields.io/badge/CAPABILITIES-124%20%2B%20REPAIR-146C94?style=for-the-badge&labelColor=101820" alt="124 capabilities plus repair utility"></a>
  <a href="agents/Antigravity/custom-agents/"><img src="https://img.shields.io/badge/SPECIALISTS-6-3D7A78?style=for-the-badge&labelColor=101820" alt="6 specialized agents"></a>
  <a href="shared/control-plane/"><img src="https://img.shields.io/badge/CONTROL-LEAST%20PRIVILEGE-C59B57?style=for-the-badge&labelColor=101820" alt="Least privilege control plane"></a>
</p>

<p align="center"><sub>Designed and maintained by <strong>Mansoor Khan</strong> · Private use</sub></p>

<details>
  <summary><strong>At a glance</strong></summary>

  <br>

  | Layer | Purpose |
  | :--- | :--- |
  | **Agent orchestration** | Routes work through architecture, schema, UI, builder and verifier roles. |
| **Research & reconstruction** | Finds authoritative references and maps existing code before proposing changes. |
| **Distinctive UI & image assets** | Routes product-specific art direction, reference research, and optional image generation automatically. |
| **.NET engineering** | 30 focused skills for architecture, ASP.NET Core, data, security, testing, operations and releases. |
| **Backend & ML engineering** | 39 specialist skills for Node.js, Python APIs, PyTorch, datasets, training, evaluation, model serving and MLOps, plus shared threat modeling and clean-code standards. |
| **Automatic team routing** | One manager selects global skills, consults architecture/UI profiles when relevant, and delegates task-scoped workers with contract handoffs and verification. |
  | **Project continuity** | Keeps plans, decisions, evidence and rounds in contributor-scoped knowledge branches. |
  | **Portable setup** | Installs the skills, specialist agents and approved context on Windows devices. |
  | **Provider bridge** | Supports optional DeepSeek Hermès execution with Gemini fallback. |

</details>

<details>
  <summary><strong>Contents</strong></summary>

  1. [Portable setup](#1-portable-setup)
  2. [Execution bridge](#2-deepseek-hermès--gemini-fallback)
  3. [Research engine](#3-research--secondary-verification)
  4. [Agent architecture](#4-agent-architecture)
  5. [Skills inventory](#5-skills-inventory)
  5a. [.NET engineering pack](#5a-net-engineering-pack)
  5b. [Backend & ML engineering pack](#5b-backend--ml-engineering-pack)
  6. [Specialist agents](#6-specialist-agents)
  7. [Project knowledge](#7-project-knowledge)
  8. [Control plane](#8-control-plane)
  9. [Provider setup](#9-provider-setup)
  10. [Operating protocol](#10-operating-protocol)
  11. [Shared project context](#11-shared-project-context)
  12. [Verification record](#12-verification-record)

</details>

---

## 1. Portable setup

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
1. **124 capability skills + 1 repair utility** ko `%USERPROFILE%\.gemini\config\skills` mein install karti hai.
2. **6 persistent custom-agent profiles** ko `%USERPROFILE%\.gemini\config\agents` mein register/update karti hai. Backend/ML worker roles are task-scoped manager invocations, not extra installed profiles.
3. **DeepSeek Hermès Bridge** ko portable setup karti hai:
   - `subagents/deepseek-hermes/dsh-profile/` se aapke pre-configured login credentials (`.credentials.yaml`), free-tier device tokens, aur gateway settings ko `%USERPROFILE%\.dsh\` par restore kar deti hai.
   - Provider/device binding ki wajah se destination par login ya authorization dobara maangi ja sakti hai; installer profile ko restore karta hai, account policy ko bypass nahi karta.
4. **4-Key Gemini Fallback Pool** (`gemini-pool.json`) aur `.env` keys ko configure kar deti hai.
5. Workstyle preferences aur project flow datasets ko `%USERPROFILE%\.gemini\agent-context\datasets` mein link kar deti hai.

---

## 2. DeepSeek Hermès & Gemini fallback

Aapka system autonomous subagent execution ke liye 2-tier priority model use karta hai:

```
+-------------------------------------------------------------------------------+
| PRIORITY 1: Logged-in DeepSeek Free Account Models (via .dsh credentials)      |
| -> Executes headless tasks with zero token cost                               |
+---------------------------------------+---------------------------------------+
                                        | (Only when provider-supported fallback is allowed)
                                        v
+-------------------------------------------------------------------------------+
| PRIORITY 2: Configured Gemini fallback, within provider plan limits            |
| -> Use supported fallback; do not rotate accounts to evade quotas             |
+-------------------------------------------------------------------------------+
```

Tamam runner scripts aur connection files [`subagents/deepseek-hermes/`](subagents/deepseek-hermes/) mein version-controlled hain.

---

## 3. Research & secondary verification

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

## 4. Agent architecture

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

## 5. Skills inventory

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
| 51 | `modern-ui-art-direction` | **Product UI** | Product-specific visual direction, hierarchy, density, accessibility and responsive composition. |
| 52 | `design-reference-research` | **UI Research** | Verified first-party references, traceable adaptations and visual trade-offs. |
| 53 | `production-image-generation` | **Visual Assets** | Provider-aware realistic image prompts, reference edits, output inspection and secret-safe setup. |
| 54 | `secure-design-threat-modeling` | **Security** | Cross-stack abuse-case mapping, tenant/auth boundaries and evidence-linked controls. |
| 55 | `production-code-quality` | **Engineering Quality** | Maintainable functions, useful API docs/comments and reviewable production changes. |

These five capabilities are automatically routed by `production-orchestrator`: UI work receives art direction/research, image generation is selected only when the task needs an asset, and backend work receives shared threat modeling plus its runtime-specific security skill. Image generation depends on an actually available provider/tool; API keys remain in the user's local secret store and are never part of the portable skills pack. The prompt workflow follows current provider documentation (for example, [Google Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation)); verify current model IDs and output support when running it.

## 5a. .NET engineering pack — 30 specialist skills

The new pack routes by project signals and task scope. It follows Microsoft's guidance that logical layers and physical deployment tiers are different concepts; start with a layered or modular monolith unless independent deployment/scaling needs justify distributed services. [Microsoft architecture guidance](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures)

| Focus | Skills |
| :--- | :--- |
| **Architecture** | `dotnet-solution-architect`, `dotnet-three-tier-architecture`, `dotnet-clean-architecture`, `dotnet-modular-monolith`, `dotnet-domain-driven-design`, `dotnet-architecture-review` |
| **Application & data** | `dotnet-aspnetcore-api`, `dotnet-efcore-data`, `dotnet-database-migrations`, `dotnet-dependency-injection`, `dotnet-openapi-contracts`, `dotnet-frontend-blazor-mvc` |
| **Security & tenancy** | `dotnet-authentication-authorization`, `dotnet-secure-coding`, `dotnet-secrets-configuration`, `dotnet-multitenancy-data-isolation` |
| **Testing & quality** | `dotnet-testing-strategy`, `dotnet-xunit-testing`, `dotnet-integration-testing`, `dotnet-cicd-quality-gates` |
| **Operations & performance** | `dotnet-background-workers`, `dotnet-resilience-observability`, `dotnet-performance-profiling`, `dotnet-caching`, `dotnet-containerization-deployment`, `dotnet-release-readiness` |
| **Integration & evolution** | `dotnet-messaging-integration`, `dotnet-domain-events-cqrs`, `dotnet-upgrades-dependency-health`, `dotnet-legacy-modernization` |

For every .NET task, load `dotnet-solution-architect` plus only the skills matching the changed area. Examples: EF schema work loads data + migration + integration-testing; a new API loads API + auth + OpenAPI + testing; release readiness loads security + deployment + CI + release skills.

---

## 5b. Backend & ML engineering pack — 39 specialist skills

This pack covers Node.js/TypeScript services, Python APIs and production ML from data framing through training, evaluation, deployment and monitoring. All skills install into the global skill library. One production manager routes a focused subset, consults `saas-architect` and `mansoor-ui-specialist` when relevant, and invokes temporary task-scoped workers for independent implementation/review. It does not add persistent Node, Python or ML agent profiles.

| Focus | Skills |
| :--- | :--- |
| **Node architecture & APIs** | `node-backend-architecture`, `node-api-design`, `node-typescript-services`, `node-framework-nestjs`, `node-framework-express-fastify` |
| **Node security, data & operations** | `node-auth-security`, `node-data-access`, `node-postgres-data`, `node-queues-workers`, `node-testing-quality`, `node-performance-runtime`, `node-observability-resilience`, `node-deployment-delivery` |
| **Python services** | `python-backend-architecture`, `python-fastapi-services`, `python-django-api`, `python-typing-contracts`, `python-async-concurrency`, `python-data-persistence`, `python-security`, `python-testing-quality`, `python-packaging-deployment` |
| **ML & PyTorch lifecycle** | `ml-problem-framing`, `ml-data-quality`, `ml-feature-engineering`, `ml-experiment-reproducibility`, `ml-pytorch-model-design`, `pytorch-training-systems`, `pytorch-distributed-training`, `ml-evaluation-validation`, `ml-hyperparameter-optimization`, `ml-transformers-finetuning`, `ml-model-serving`, `mlops-pipelines-registry`, `ml-monitoring-drift`, `ml-gpu-performance`, `ml-inference-optimization`, `ml-privacy-supply-chain`, `backend-ml-integration` |

Start with `backend-ml-skill-router`; it uses repository reverse engineering, selective research, structured specialist handoffs, non-overlapping file ownership and independent verification. Run the local router with `node tools/route-backend-ml-task.mjs --project "Cartivo" --task "Train and serve a PyTorch model" --files pyproject.toml train.py`. For concurrent projects, run it separately with each project's own files and memory ID. It returns the manager, relevant persistent review profiles, worker roles and skill names; the manager performs subagent invocations. Verify routing against actual project files and current official documentation.

The skills' operating checks are grounded in primary documentation: [Node.js learning and operations](https://nodejs.org/learn), [FastAPI deployment concepts](https://fastapi.tiangolo.com/deployment/concepts/), [PyTorch training tutorials](https://docs.pytorch.org/tutorials/beginner/introyt/trainingyt), and [scikit-learn leakage and validation pitfalls](https://scikit-learn.org/stable/common_pitfalls).

---

## 6. Specialist agents (`agents/Antigravity/custom-agents/`)

1. **`production-orchestrator`** *(Sole Lead Manager)*: Governs skill selection, scoped worker dispatch, architecture coordination, and verification.
2. **`saas-architect`**: Cloud & enterprise software architecture, multi-tenancy, and ADRs.
3. **`enterprise-schema-architect`**: ERP reverse engineering (SAP S/4HANA & ERPNext), ledger immutability, relational models.
4. **`mansoor-ui-specialist`**: Autonomous deep design research, minimalism/glassmorphism tokens, and visual wireframes.
5. **`live-web-auditor`**: Chrome DevTools live QA, network inspection, and responsive smoke tests.
6. **`omniroute-gateway-operator`**: Local LLM gateway configuration and multi-model failover.

---

## 7. Project knowledge: branches and rounds

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

## 8. Control plane

For remote management, use the checked-in least-privilege control contract in `shared/control-plane/`. The recommended transport is a GitHub App installed only on the selected private knowledge repository. It should use repository metadata read, contents write for knowledge branches, and optional pull-request/actions read for evidence; it should not request administration access. App credentials stay outside this repository.

Validate the local policy before distribution:

```powershell
node tools/validate-capability-manifest.mjs
```

GitHub rulesets should protect `main`, block force-push, and target `knowledge/**`. The local project repository is never reconfigured by the sidecar.

---

## 8.1 Inventory note

The current hub inventory now contains **125 skill folders**: **124 capability skills plus `skill-repair` as the self-healing utility**. This includes the 30-skill .NET pack, 39-skill backend/ML pack, five new cross-cutting UI/image/security/quality skills, and existing orchestration skills. It contains **6 persistent custom agents**; backend/ML worker roles are spawned under the production manager for each task.

The count is verified from the folders currently present in `skills/` and `agents/Antigravity/custom-agents/`. It is safer to describe this as an inventory verification than to claim that every production behavior has been exhaustively tested on every destination PC.

## 9. Provider setup

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

## 10. Operating protocol

Every requested build follows this sequence:

1. **Lead gate:** understand the request, ask only high-value Socratic questions, identify permissions, data boundaries and success evidence.
2. **Architecture review:** inspect the repository and produce an `[ARCH-PROPOSAL]` with folder structure, stack choices, contracts and risks.
3. **Schema review:** produce `[SCHEMA-SYNC]` for entities, foreign keys, tenant isolation, lifecycle transitions, idempotency and numerical precision.
4. **UI research:** perform autonomous reference search, compare at least two suitable directions, then produce `[UI-BLUEPRINT]` with tokens and a wireframe before implementation.
5. **Zero-code gate:** no builder edits until architecture, schema and UI constraints are recorded and the scope is approved by the lead.
6. **Scoped build:** use the smallest diff and preserve existing APIs, state flows, permissions and project conventions. DeepSeek Hermès may execute the scoped task; Gemini remains the lead and gatekeeper.
7. **Secondary verification:** independently check the result with focused tests, runtime evidence, browser smoke tests where applicable, and a diff review. Report observed facts separately from assumptions.

“Minimal UI”, “glass effect”, “polymorphism”, or similar requests trigger the research and option-comparison path automatically. The user does not need to provide CSS examples first.

## 11. Shared project context

Reusable context is stored in `shared/knowledge/datasets/` and is installed to `%USERPROFILE%\.gemini\agent-context\datasets`. Read `WORKSTYLE.md`, then `PROJECT_FLOWS.md`, then the relevant project dossier and conversation index before changing an existing project. These files describe approaches and invariants; the agent must still inspect the current repository because archived context can become stale.

## 12. Verification record

- 125 skill folders (124 capability skills plus repair utility) and 6 persistent custom-agent definitions are present after adding the UI/image/security/quality pack.
- Backend/ML routing tests cover manager-only routing, task-scoped Node/Python/ML workers, automatic modern UI/image/security skill selection, UI/architecture review selection, training gates and manifest-only detection.
- DeepSeek Hermes provider files in the hub match the current local Hermes setup by size and SHA-256; secret values were not printed.
- Native Antigravity snapshot contains 56 app conversations, 4 IDE stores, 56 sidebar summary rows and 18 project definitions.
- Native sidebar SQLite summary passes `integrity_check` and contains 56 conversation rows.
- PowerShell installer and native restore scripts parse successfully.

The hub is ready for production migration, with provider setup and native chat restore kept as explicit, reversible steps.
