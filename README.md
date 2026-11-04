# MANSOOR FAROOQ | PRIVATE GEMINI AGENT TEAM

> Premium private engineering release · Designed and maintained by Mansoor Farooq

An Antigravity agent system for product engineering: one lead manager, focused specialists, evidence-led research, clean delivery and an owner-signed release gate.

## Product identity

This private developer tool reflects Mansoor Farooq's senior engineering practice across architecture, UI systems, backend services, automation, security review, testing and release quality. It helps turn a product brief into a bounded implementation plan, a focused code change and a verifiable handoff.

## What this system delivers

| Capability | Result |
|---|---|
| Single manager | `production-orchestrator` owns routing, delegation and final verification. |
| Specialist team | UI, Flutter, .NET, Node, Python, ML, cloud data, workflows, security, QA, research and hub operations. |
| Evidence-first work | Repository reconstruction, current research, explicit assumptions and reproducible checks. |
| Fast execution | Flash model, low thinking and one relevant specialist for routine work. |
| Claude-style quality | Result-first answers, concise rationale, clear evidence boundaries and professional handoffs. |
| Portable install | One ZIP and one installer command for a new Antigravity machine. |
| Owner-signed release | Ed25519 package signature, checksum verification and fail-closed installation before Antigravity validation. |

## Team map

| Area | Agent |
|---|---|
| Manager and orchestration | `production-orchestrator` |
| Product UI and design systems | `mansoor-ui-specialist` |
| Flutter, Dart and Android | `flutter-mobile-specialist` |
| SaaS and system architecture | `saas-architect` |
| ERP, schema and relationships | `enterprise-schema-architect` |
| .NET and ASP.NET Core | `dotnet-backend-specialist` |
| Node.js and TypeScript | `node-backend-specialist` |
| Python services | `python-backend-specialist` |
| ML, PyTorch and MLOps | `ml-systems-specialist` |
| Cloud data engineering | `cloud-data-engineer` |
| Workflow automation | `workflow-automation-specialist` |
| Application security | `application-security-reviewer` |
| QA and release readiness | `qa-release-specialist` |
| Research and documentation | `research-docs-specialist` |
| Agent hub maintenance | `agent-hub-maintainer` |

## Installation

1. Install Antigravity and sign in with the target user's Gemini account.
2. Download the release from [Mansoor Farooq's GitHub repository](https://github.com/mansoor-farooq/my_ai_agent) and extract the ZIP.
3. Double-click `Install-Mansoor-Agent-Team.cmd`.

The installer verifies the package, runs Antigravity's strict plugin validation and installs or updates the team. No GitHub sign-in is required. Restart Antigravity after installation or reload its skills and agents.

## Fast mode

For quick fixes, choose `Gemini 3.8 Flash` with `Low` thinking. The manager reads the affected files, chooses one specialist and skips deep research unless the task needs it. Use `Medium` or `High` thinking for architecture, security, migration, ML, release work or explicit research. CLI sessions can use:

```powershell
agy --model="Gemini 3.8 Flash"
```

## Response quality

`claude-style-response-quality` is a shared contract across the team. It requires result-first answers, plain language, concise rationale, evidence and assumption boundaries, production-grade change reports, Roman Urdu when that matches the user and no invented tool results or hidden chain-of-thought. It improves answer quality without pretending that the underlying model is Claude.

## Models and keys

All agent profiles use `model: inherit`. With no API keys, the signed-in Antigravity/Gemini session powers the manager and specialists. Optional integration keys belong in a local ignored `.env` created from [.env.example](.env.example). The portable plugin does not route keys automatically; a project-specific integration must explicitly read its variable.

## Owner-signed release and private licence

This is a private, owner-controlled release by Mansoor Farooq. The build signs `PACKAGE-CHECKSUMS.json` with an Ed25519 key held outside the repository. The installer verifies the trusted public key, GitHub owner/repository metadata, the manifest signature and every packaged file before Antigravity runs. A changed, missing or replaced file stops installation.

The private signing key is never committed, never copied into the ZIP and never placed in `.env`. This repository does not grant a public redistribution licence. Future public publishing requires a deliberate licence decision, release review and branch protection by the repository owner.

## Integrity and tamper response

The generated package includes `PACKAGE-CHECKSUMS.json`. The installer hashes every packaged file before calling Antigravity. If a file is changed, removed or replaced, installation stops with an integrity error. This protects execution from accidental or ordinary unauthorized modification.

This is tamper detection, not an unbreakable DRM system. Anyone with full filesystem access can inspect or replace code. Strong protection requires a privately held signing key, restricted file permissions, encrypted distribution or a hosted service. The package never contains provider credentials, customer data, private chats or hidden model reasoning.

## Portfolio and verified links

- [Mansoor Farooq on GitHub](https://github.com/mansoor-farooq)
- [Private agent-team repository](https://github.com/mansoor-farooq/my_ai_agent)
- [Release page](https://github.com/mansoor-farooq/my_ai_agent/releases)

See [portfolio SEO copy and public-release checklist](docs/PORTFOLIO_SEO.md) before publishing this project.

Antigravity compatibility notes and the post-update subagent checks are recorded in [ANTIGRAVITY_SUBAGENT_COMPATIBILITY.md](docs/ANTIGRAVITY_SUBAGENT_COMPATIBILITY.md).

Portfolio keywords: Antigravity agent orchestration, Gemini agent team, software architecture, production UI engineering, .NET, Node.js, Python, PyTorch, workflow automation, application security and release engineering.

## Build and verify from source

```powershell
powershell -ExecutionPolicy Bypass -File .\install-antigravity-portable.ps1
node tools/agent-hub-doctor.mjs --format json
node --test tools/tests/agent-hub-doctor.test.mjs tools/tests/backend-ml-router.test.mjs
```

Current package facts: 15 agent profiles, zero bundled skill bodies, zero provider connectors, zero credential paths, owner-signed package metadata, strict Antigravity validation and focused tests passing.

— Mansoor Farooq
