# Custom Specialist Skill Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared locally-authored custom skill layer that gives every specialist a curated 10–12 skill bundle and works in Antigravity and Codex.

**Architecture:** Keep skill bodies in the existing portable `skills/` root. A deterministic manifest maps specialist IDs to shared controls and domain overlays; profile synchronization consumes that manifest. A guarded Codex installer syncs the custom skills into `~/.agents/skills` while preserving unrelated skills.

**Tech Stack:** Markdown Agent Skills, Node.js ESM, Gemini/Antigravity profiles, Codex TOML, Node test runner, existing ZIP/provenance/checksum pipeline.

**Spec:** `docs/superpowers/specs/2026-11-23-custom-specialist-skill-wave-design.md`

## Global Constraints

- Preserve `production-orchestrator` as the only manager.
- Do not add credentials, remote connectors or host permission bypasses.
- Every new skill description starts with `Use when...` and each skill names a stop condition.
- Existing skills, routing and Turbo/WSL/Windows behavior remain compatible.
- Codex synchronization refuses to overwrite unrelated non-Mansoor skills.

## Review Focus

- A profile references a missing custom skill: inventory test must fail closed.
- A custom skill has invalid frontmatter or a workflow summary in its description: skill validation must reject it.
- A Codex target contains an unrelated skill: installer must preserve it and refuse replacement.
- A specialist gets fewer than ten or more than twelve custom skills: bundle test must fail.
- The package omits the custom skill library: portable package test must fail.

### Task 1: Inventory and failing tests

**Files:**
- Create: `tools/custom-skill-wave.mjs`
- Test: `tools/tests/custom-skill-wave.test.mjs`

- [ ] Write tests for 24 skill IDs, profile bundle cardinality, manager-only delegation and missing-skill rejection.
- [ ] Run the focused test and observe the expected missing-module failure.
- [ ] Implement the manifest and `customSkillsForAgent(agentId)` helpers.
- [ ] Run the focused test and confirm the manifest contract passes.

### Task 2: Skill bodies

**Files:**
- Create: `skills/mansoor-*/SKILL.md` for the 24 family members.

- [ ] Write concise trigger-only descriptions and evidence/stop-condition bodies.
- [ ] Validate every skill with the local skill validator.
- [ ] Confirm each body is locally authored and has no provider credentials.

### Task 3: Profile wiring

**Files:**
- Modify: `agents/Antigravity/custom-agents/*/agent.md`
- Modify: `tools/custom-skill-wave.mjs`

- [ ] Add the manifest-selected custom skills to each specialist without removing existing skills.
- [ ] Keep the main manager as the only delegating profile.
- [ ] Test every reference resolves and every bundle remains 10–12 custom skills.

### Task 4: Codex and package support

**Files:**
- Create: `tools/install-codex-custom-skills.mjs`
- Modify: `package.json`
- Modify: `tools/build-antigravity-plugin.mjs`
- Modify: `tools/tests/portable-plugin-contents.test.mjs`

- [ ] Add guarded sync into `~/.agents/skills` for all custom skills.
- [ ] Bundle the installer and custom skill manifest in the portable package.
- [ ] Preserve unrelated Codex skills and report exact changes.

### Task 5: Provenance, docs and final verification

**Files:**
- Modify: `README.md`
- Modify: `SKILL-PROVENANCE.json`
- Modify: `KEY-CHECKSUMS.json`

- [ ] Document the custom-skill wave and Codex sync command.
- [ ] Refresh provenance/checksums.
- [ ] Run doctor, focused tests and signed package build; report any credential-gated skips separately.
