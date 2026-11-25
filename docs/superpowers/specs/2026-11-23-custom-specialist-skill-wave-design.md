# Custom Specialist Skill Wave

## Intent

Give every Mansoor AI Team Manager specialist a compact, locally-authored control layer that improves task boundaries, context reuse, evidence quality, parallel handoffs, recovery and domain-specific delivery. The same skill files must be discoverable by Antigravity/Gemini and Codex through the portable `skills/` library and the shared `~/.agents/skills` convention.

## Goals

- Add twelve shared execution-control skills and twelve domain-quality overlay skills.
- Give each shipped specialist a curated 10–12 skill bundle: shared controls plus the domain overlay relevant to that agent.
- Keep `production-orchestrator` as the only manager and preserve the existing routing, Turbo, WSL/Windows and isolated-worktree behavior.
- Make skills concise, evidence-oriented and safe to load on demand; avoid 200 duplicate agent-specific files.
- Ship a Codex sync command that copies all locally-authored custom skills without overwriting unrelated user skills.

## Non-goals

- No provider credentials, remote MCP connectors or unrestricted host permission bypass.
- No automatic cloning/copying of third-party repositories; Open-Source-First remains the provenance gate.
- No rewrite of existing Antigravity native tool behavior.

## Skill families

Shared controls: `mansoor-task-contract`, `mansoor-context-snapshot`, `mansoor-evidence-loop`, `mansoor-parallel-handoff`, `mansoor-regression-matrix`, `mansoor-dependency-risk`, `mansoor-failure-recovery`, `mansoor-permission-lane`, `mansoor-source-provenance`, `mansoor-platform-adapter`, `mansoor-artifact-quality`, `mansoor-owner-handoff`.

Domain overlays: `mansoor-backend-contracts`, `mansoor-data-integrity`, `mansoor-mobile-release`, `mansoor-ui-state-quality`, `mansoor-seo-live-audit`, `mansoor-web-performance`, `mansoor-media-render-qa`, `mansoor-image-asset-provenance`, `mansoor-ci-failure-triage`, `mansoor-research-synthesis`, `mansoor-security-boundary`, `mansoor-architecture-evolution`.

## Bundle policy

Each specialist receives the ten most relevant shared controls plus two domain overlays. The manager receives all controls and orchestration overlays; QA/release receives all controls plus every verification-oriented overlay. Existing imported skills remain available and are not replaced.

## Quality contract

Every skill starts its description with `Use when...`, stays under 500 lines, states a concrete stop condition, distinguishes observed evidence from inference, and avoids claiming a live check that did not run. Skill provenance is locally authored and is refreshed in `SKILL-PROVENANCE.json`.

## Delivery

The implementation adds an inventory/mapping module, profile references, Codex custom-skill sync, package inclusion, focused tests, provenance/checksum refresh and a full signed package verification.
