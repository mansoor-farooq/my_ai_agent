# Full Portable Agent Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained Antigravity ZIP that installs the full Mansoor manager, specialist, skill and rule product on a clean machine.

**Architecture:** The repository becomes the complete release source. A portable-component helper inventories and copies approved skills and rules; the existing packer preserves agent skill metadata and continues signing every output file.

**Tech Stack:** Node.js ESM, PowerShell, Antigravity CLI, Node test runner, Ed25519 package signing.

**Spec:** `docs/superpowers/specs/2026-11-04-full-portable-agent-product-design.md`

## Global Constraints

- Do not bundle credentials, provider connectors, MCP servers, hooks, sidecars, native profiles or private chats.
- Keep all 15 agent profiles and the sole-manager topology.
- Preserve third-party licence notices.

## Review Focus

- Missing `SKILL.md` files must fail the build inventory.
- Invalid rule triggers must fail source validation.
- Missing agent-referenced skills must fail tests and doctor checks.
- Credential-like values in portable components must stop packaging.
- Strict Antigravity validation must report 159 skills, 15 agents and 4 rules.

---

### Task 1: Complete portable source inventory

**Files:**
- Create: `tools/portable-components.mjs`
- Create: `tools/tests/portable-plugin-contents.test.mjs`
- Create: `rules/*.md`
- Create: `skills/{android-design,flutter-ui-ux,flutter-ui-ux-engineer,mobile-ui-ux-designer}/...`

- [ ] Write and run the failing inventory/reference tests.
- [ ] Import the four referenced global skills with provenance/licence data.
- [ ] Import and repair the four valid Antigravity rules.
- [ ] Implement source inventory and safe recursive copying.
- [ ] Run the focused test until it passes.

### Task 2: Package the complete product

**Files:**
- Modify: `tools/build-antigravity-plugin.mjs`
- Modify: `tools/agent-hub-doctor.mjs`
- Modify: `tools/tests/agent-hub-doctor.test.mjs`

- [ ] Preserve agent `skills:` metadata and copy portable components.
- [ ] Update doctor policy from skills-free to connector-free, self-contained packaging.
- [ ] Bump the package version and update package documentation/counts.
- [ ] Run doctor and focused tests.

### Task 3: Release verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `install-antigravity-portable.ps1`
- Modify: `build-agent-hub.ps1`
- Modify: `KEY-CHECKSUMS.json`

- [ ] Run `npm run build`.
- [ ] Extract and strictly validate the ZIP component counts.
- [ ] Verify the owner signature and package manifest.
- [ ] Commit and synchronize the four approved branches.
