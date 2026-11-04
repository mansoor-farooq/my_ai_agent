# Mansoor Gemini Agent Team

Portable expert-agent team for Antigravity. The package has one Gemini-inherited manager and focused field specialists. It includes **no external provider connectors, provider bridges, OAuth setup, API keys, MCP servers, or bundled skill bodies**; bounded research/image tools are declared in the agent contracts and come from the target runtime.

## Team

`production-orchestrator` is the only manager. It routes a bounded task to the matching expert and loads only relevant skills already available in the host Antigravity installation.

| Area | Agent |
|---|---|
| Flutter, Dart, Android | `flutter-mobile-specialist` |
| Product UI and design systems | `mansoor-ui-specialist` |
| SaaS and system architecture | `saas-architect` |
| ERP, schema, data relationships | `enterprise-schema-architect` |
| .NET / ASP.NET Core | `dotnet-backend-specialist` |
| Node.js / TypeScript | `node-backend-specialist` |
| Python services | `python-backend-specialist` |
| ML and model operations | `ml-systems-specialist` |
| Cloud data engineering | `cloud-data-engineer` |
| Workflow engineering | `workflow-automation-specialist` |
| Application security | `application-security-reviewer` |
| QA and release readiness | `qa-release-specialist` |
| Research and engineering docs | `research-docs-specialist` |
| This agent hub | `agent-hub-maintainer` |

There are **15 agent profiles** in the package, including the manager. Browser/gateway connector profiles were removed from the source tree; bounded reference research remains available through the research tools declared in the relevant agents.

## Skills and context budget

Antigravity remains the owner of its installed skill library. This kit does not copy or install the user's 453 claimed skills. Each agent names relevant skill areas and the manager loads only what a task needs, avoiding a second bulk catalog and reducing always-loaded context. A local inventory found 258 unique Antigravity skill names across the inspected global skills/plugins; this does not confirm the separate 453 count shown in the user's environment.

## Build and validate

Run from this checkout:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-antigravity-portable.ps1
node tools/agent-hub-doctor.mjs --format json
```

This writes `dist\mansoor-agent-hub.zip` inside this repository and does not change a user profile or contact providers. On a target machine, extract the ZIP and run:

```powershell
agy plugin validate --strict <extracted-folder>
agy plugin install <extracted-folder>
```

No GitHub sign-in is needed for a local folder install. The target machine must have Antigravity CLI and its own Gemini sign-in. The agents use the target's inherited Gemini model; this kit does not configure model credentials.

## Source boundary

The checked-out repository contains historical provider/connector experiments from earlier work. They are not part of this portable agent kit, are not copied by its packer, and are not configured by this installation path. The packer includes only the selected agent profiles, manifest, logo, and README.

Current objective and design: [agent-team plan](docs/superpowers/plans/2026-11-03-antigravity-domain-agent-team.md). Timestamped work history: [daily progress](Progress/2026-11-03.md).
