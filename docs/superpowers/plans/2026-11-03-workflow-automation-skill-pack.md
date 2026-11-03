# Workflow Automation Capability Plan

> **For agentic workers:** execute in small reviewable tasks, with the manager retaining ownership of routing and approvals.

**Goal:** Give the agent reusable, automatically selected workflow engineering skills centered on real research, data-backed product flows, explicit approvals and production operations.

**Architecture:** Add 24 focused skills and route only the subset triggered by task/content signals from the existing manager router. Enable Antigravity's native Google Search and URL reader for grounded research and image generation where supported; do not create another permanent agent or load all skills into every task.

**Tech Stack:** Antigravity custom-agent Markdown, Agent Skills, existing Node router and Node test runner.

**Spec:** User asks for 20+ workflow automation skills; research reused across products; non-generic product UI; approval scenarios; use real data rather than fake UI state.

## Global Constraints

- Keep `production-orchestrator` the sole always-on manager and never make the user pick skills.
- New-workflow research must search with Google Search, open first-party sources, cite claims, save a concise source ledger, and distinguish evidence from inference.
- UI work must show an approval artifact for material choices; application runtime approval flows must be persisted, authorized and auditable in the real data store.
- Never fabricate production records, approvals, execution results, client details or metrics.
- Preserve existing project APIs, schemas, secrets and security boundaries; add no provider keys.
- Use the Agent Skills format because legacy Antigravity markdown workflows are past their documented retirement date.
- Synchronize the verified change to `main`, `c-development`, `development`, and `mansoor-development`.

## Tasks

1. Add 24 narrow workflow skills with distinct triggers, operational contracts and official reference links where version-sensitive.
2. Extend automatic routing and tests for workflow baseline, approval UI/database backing, webhook/idempotency, and no workflow noise for a bounded UI fix.
3. Strengthen manager/UI prompt policy: mandatory product research on new product/architecture/workflow work; visual approval gate; database-backed operator surfaces; native search/fetch/image tools.
4. Update README and installer so new skills install and hub-managed workflow/router references update safely.
5. Run router, manifest, skill-frontmatter and installer syntax checks; install locally without Hermes credential or native history changes; push all four branches.
