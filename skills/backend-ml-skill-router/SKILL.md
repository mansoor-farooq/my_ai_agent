---
name: backend-ml-skill-router
description: Use when routing a backend, data-platform or ML task to the focused Gemini domain specialist and selecting a small subset of Antigravity's already-installed skills.
---

# Backend, Data and ML Specialist Routing

Keep `production-orchestrator` as the only manager. The expert agents inherit the active Gemini model and are installed as persistent Antigravity subagents.

## Route by task

- Node/TypeScript services -> `node-backend-specialist`
- Python services -> `python-backend-specialist`
- .NET/C#/ASP.NET Core -> `dotnet-backend-specialist`
- ML, PyTorch, training, evaluation or serving -> `ml-systems-specialist`
- BigQuery, Spark, Dataproc, Dataflow or data pipelines -> `cloud-data-engineer`
- state machines, retries, queues, approvals or scheduled workflows -> `workflow-automation-specialist`

Use `saas-architect` for system boundaries and `enterprise-schema-architect` for schema/ERP invariants. Add `application-security-reviewer` or `qa-release-specialist` only when the risk or requested review warrants it.

Load only the few matching skills from the Antigravity host catalog. A skill inventory or router suggestion is not evidence that its instructions were loaded or its checks ran. Preserve project APIs, permissions, tenant isolation, data provenance and existing local changes.

## Research boundary

The agent hub does not configure MCP, OAuth, provider bridges, or external service clients. Specialists may use bounded `search_web` and `read_url_content` for official framework/security references after repository reconstruction. Never send secrets, private project files or customer data to research tools.

## Handoff

Give the selected specialist one project root, a narrow goal, owned paths, invariants, relevant skill names and expected local evidence. Keep separate tasks disjoint. The manager integrates results and reports changed paths, actual checks, assumptions and blockers. Never store hidden chain-of-thought, credentials, raw customer data or unrelated transcripts.
