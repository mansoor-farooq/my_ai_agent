# Premium Domain Capsules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register twenty premium domains with twelve custom skill slots and twelve on-demand bonus roles each, while shipping high-quality frontend, backend, architecture, coding and creative-production skill bodies.

**Architecture:** A deterministic `premium-domain-capsules.mjs` registry owns domain metadata, skill slots, role prompts and activation limits. Frontend/backend premium skill bodies live in `skills/`; other slots reuse existing governed skills. The premium router exposes the selected capsule and the manager remains the only dispatcher.

**Tech Stack:** Markdown Agent Skills, Node.js ESM, Antigravity profiles, existing premium router/plan, Node test runner, portable ZIP/provenance pipeline.

**Spec:** `docs/superpowers/specs/2026-11-23-premium-domain-capsules-design.md`

## Global Constraints

- Exactly 20 domains, 12 skill slots and 12 bonus roles per domain.
- At most 5 bonus roles activate in one wave; only the manager dispatches.
- Frontend live work ends with browser evidence and Lighthouse; backend work ends with contract/security evidence.
- Existing permissions, WSL/Windows fallback, Open-Source-First and isolated promotion remain intact.

## Tasks

### Task 1: Contract-first tests and registry

**Files:** Create `tools/premium-domain-capsules.mjs`, `tools/tests/premium-domain-capsules.test.mjs`.

- [x] Write failing tests for 18 domains, 12 skills, 12 roles, activation cap and frontend/backend/creative required gates.
- [ ] Implement the registry and `selectPremiumCapsule({domain, request})`.
- [ ] Verify the tests pass.

### Task 2: Frontend premium skill bodies

**Files:** Create `skills/mansoor-premium-frontend-*/SKILL.md`.

- [ ] Add twelve concise, locally-authored skills with stop conditions.
- [ ] Verify frontmatter and required browser/performance/accessibility evidence.

### Task 3: Backend/database premium skill bodies

**Files:** Create `skills/mansoor-premium-backend-*/SKILL.md`.

- [ ] Add twelve concise, locally-authored security/data/release skills with stop conditions.
- [ ] Verify frontmatter and negative-path requirements.

### Task 4: Manager routing and package support

**Files:** Modify `tools/premium-agent-router.mjs`, `tools/ultra-agent-v3/plan.mjs`, `tools/build-antigravity-plugin.mjs`, `build-agent-hub.ps1`, `README.md`.

- [ ] Return premium capsule selection for frontend/backend/domain requests.
- [ ] Bundle the registry and update the package docs/tests.

### Task 5: Provenance and full verification

- [ ] Refresh provenance/checksums.
- [ ] Run doctor, focused tests and signed package build; report skips separately.
