---
name: backend-ml-skill-router
description: Use when a task spans Node.js, Python, data engineering or machine learning, or when choosing global skills and task-scoped workers under one manager.
---

# Backend and ML Skill Router

Run node tools/route-backend-ml-task.mjs with --project, --task and --files when this repository contains the router. On a portable Antigravity install, run the installed agent-hub-tools/route-backend-ml-task.mjs and pass --root to the Antigravity config directory. For multiple projects, route each project separately with its own root/files and memory ID. Treat its output as a starting selection; repository evidence and task scope decide the final subset.

## Lead-agent team flow
1. **Discover/reverse engineer:** read AGENTS.md/README, manifests and lockfiles; map entry points, data flow, existing contracts, tests and deployment files. Use the repository's reverse-engineering skill for unfamiliar or legacy code.
2. **Single manager:** production-orchestrator is the only always-on lead. Call saas-architect for backend/system boundaries, enterprise-schema-architect for relational/schema work, and mansoor-ui-specialist for UI scope; these are review profiles, not extra managers.
3. **Select expertise:** always load the matching architecture skill and then the narrow skill subset for API, auth, data, queues, tests, deployment, model/data/evaluation/serving signals. Include security and testing whenever those boundaries change.
4. **Research:** check current official documentation for version-sensitive APIs and security guidance. Record source, version/date, applicable claim and a second independent check for consequential decisions. If sources disagree, state the discrepancy.
5. **Coordinate:** exchange SCOPE, CONTRACT, RISK, FILE-OWNERSHIP, and EVIDENCE notes. Agree on request/schema ownership, transaction boundaries, error semantics and verification before concurrent edits.
6. **Build:** manager may invoke multiple task-scoped workers through its subagent tool, passing only the selected global skills and a disjoint file scope. These invocations do not create persistent agent profiles. Use tests before implementation for behavior changes.
7. **Verify independently:** reviewer checks the diff, contracts, tests, auth/data isolation, failure cases, and actual runtime evidence. ML changes additionally require leakage-safe splits, reproducibility record and task-appropriate evaluation. A route selection itself is not proof of implementation quality.
8. **Memory and close:** load or build .agents/memory for each project, then update its map, decisions, project plan/flow and verification evidence at phase end. Give each worker exactly one project ID/root and its memory references; never mix project memories. Keep raw project data local; sync only sanitized, policy-approved notes. Never store hidden chain-of-thought. Report changed paths, commands/results, unknowns and rollback notes.

## Routing guardrails
- package.json/Node runtime signals select Node expertise; Python manifests/runtime select Python; model/training/data/inference task signals add ML expertise.
- A Python manifest alone does not mean the project uses ML. A Node API that calls a model may need both Node and ML serving/integration expertise.
- Do not spin up every specialist for every task. One focused specialist can be sufficient; multi-agent review is for cross-boundary work.
- Keep the persistent roster to the lead manager, architecture profile and Mansoor UI profile, with schema/audit/gateway profiles available when relevant. Backend/ML workers are task-scoped subagent invocations under the manager, not separately installed peer agents.
- Skills are installed globally and reusable. Load only the selected skill documents from the global skill directory; do not dump the entire skill library into every prompt.
- Respect provider plan limits and cooldowns. Do not cycle accounts or keys to evade a provider's rate or daily limits; use supported fallback or report that capacity is unavailable.
- If the detector misses a framework, pass the task and manifest path explicitly, then load the named skill manually.
