# MANSOOR FAROOQ

## Private Gemini Agent Team

An evidence-led expert-agent system for Antigravity. One lead manager routes each task to the right specialist, keeps project context focused and returns clear, professional engineering decisions.

> Designed and maintained by Mansoor Farooq · Private engineering workspace

## What this system delivers

| Capability | Result |
|---|---|
| Single manager | `production-orchestrator` owns routing, delegation and final verification. |
| Specialist team | UI, Flutter, .NET, Node, Python, ML, cloud data, workflows, security, QA, research and hub operations. |
| Evidence-first work | Repository reconstruction, current research, explicit assumptions and reproducible checks. |
| Fast execution | Flash model, low thinking and one relevant specialist for routine work. |
| Claude-style quality | Result-first answers, concise rationale, clear evidence boundaries and professional handoffs. |
| Portable install | One ZIP and one installer command for a new Antigravity machine. |
| Integrity gate | Package changes are detected before installation and installation stops. |

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
2. Extract [mansoor-agent-hub.zip](dist/mansoor-agent-hub.zip).
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

## Integrity and tamper response

The generated package includes `PACKAGE-CHECKSUMS.json`. The installer hashes every packaged file before calling Antigravity. If a file is changed, removed or replaced, installation stops with an integrity error. This protects execution from accidental or ordinary unauthorized modification.

This is tamper detection, not an unbreakable DRM system. Anyone with full filesystem access can inspect or replace code. Strong protection requires a privately held signing key, restricted file permissions, encrypted distribution or a hosted service. The package never contains provider credentials, customer data, private chats or hidden model reasoning.

## Build and verify from source

```powershell
powershell -ExecutionPolicy Bypass -File .\install-antigravity-portable.ps1
node tools/agent-hub-doctor.mjs --format json
node --test tools/tests/agent-hub-doctor.test.mjs tools/tests/backend-ml-router.test.mjs
```

Current package facts: 15 agent profiles, zero bundled skill bodies, zero provider connectors, zero credential paths, strict Antigravity validation and focused tests passing.

— Mansoor Farooq
