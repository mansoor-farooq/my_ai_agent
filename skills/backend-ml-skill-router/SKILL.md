---
name: backend-ml-skill-router
description: Use when a task spans Node.js, Python, data engineering or machine learning, or when choosing which backend specialists and skills should coordinate.
---

# Backend and ML Skill Router

Run node tools/route-backend-ml-task.mjs with --task and --files when this repository contains the router. On a portable Antigravity install, run the installed agent-hub-tools/route-backend-ml-task.mjs and pass --root to the Antigravity config directory. Treat its output as a starting selection; repository evidence and task scope decide the final subset. Load no unrelated skills just to inflate context.

## Lead-agent team flow
1. **Discover/reverse engineer:** read AGENTS.md/README, manifests and lockfiles; map entry points, data flow, existing contracts, tests and deployment files. Use the repository's reverse-engineering skill for unfamiliar or legacy code.
2. **Select team:** choose Node and/or Python backend specialist from manifests/framework signals; add ML/PyTorch specialist only when model/data/training/inference is in scope. Lead remains the sole user-facing coordinator.
3. **Select expertise:** always load the matching architecture skill and then the narrow skill subset for API, auth, data, queues, tests, deployment, model/data/evaluation/serving signals. Include security and testing whenever those boundaries change.
4. **Research:** check current official documentation for version-sensitive APIs and security guidance. Record source, version/date, applicable claim and a second independent check for consequential decisions. If sources disagree, state the discrepancy.
5. **Coordinate:** exchange SCOPE, CONTRACT, RISK, FILE-OWNERSHIP, and EVIDENCE notes. Agree on request/schema ownership, transaction boundaries, error semantics and verification before concurrent edits.
6. **Build:** assign one owner per file; avoid overlapping writes. Use tests before implementation for behavior changes. Keep model training separate from serving when lifecycle/resource/security needs demand it; do not split services by fashion.
7. **Verify independently:** reviewer checks the diff, contracts, tests, auth/data isolation, failure cases, and actual runtime evidence. ML changes additionally require leakage-safe splits, reproducibility record and task-appropriate evaluation. A route selection itself is not proof of implementation quality.
8. **Close:** lead reports decisions, changed paths, commands/results, unverified limits and rollback notes. Persist only policy-approved project memory; no silent telemetry, chat/chain-of-thought export or remote push.

## Routing guardrails
- package.json/Node runtime signals select Node expertise; Python manifests/runtime select Python; model/training/data/inference task signals add ML expertise.
- A Python manifest alone does not mean the project uses ML. A Node API that calls a model may need both Node and ML serving/integration expertise.
- Do not spin up every specialist for every task. One focused specialist can be sufficient; multi-agent review is for cross-boundary work.
- Do not create agent definitions dynamically for each project. Reuse the maintained specialist profiles and scope their task assignments.
- If the detector misses a framework, pass the task and manifest path explicitly, then load the named skill manually.
