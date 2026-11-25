# Owner-Signed Premium Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add owner-controlled Ed25519 package signing and upgrade the project README into a premium, honest, portfolio-ready private release page.

**Architecture:** The build signs the canonical checksum manifest with a private key that remains outside the repository. The installer verifies the trusted signature and every file before Antigravity validation. Documentation and GitHub policy describe the owner boundary without bundling credentials or hidden collection logic.

**Tech Stack:** Node.js built-in `crypto`, PowerShell, Antigravity CLI, Markdown, existing Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-04-owner-signed-premium-release-design.md`

## Global Constraints

- Private key must never enter Git, the ZIP, or generated package checksums.
- The package must fail closed on missing, changed, or invalid signature/checksum data.
- No emoji/Lua obfuscation, hidden data collection, credentials, or invented portfolio claims.
- Existing provider-free portable behavior and four-branch release flow remain intact.

## Review Focus

- Missing signing key: build must fail with a useful owner setup message.
- Changed manifest or packaged file: installer must stop before `agy`.
- Signature metadata altered: installer must reject the package.
- README links and SEO copy: only verified project/owner URLs and clearly marked future/public positioning.
- Generated package: private key and local `.env` values must not be present.

### Task 1: Add owner-key and package-signature helpers

**Files:**
- Create: `tools/package-signing.mjs`
- Create: `tools/create-owner-signing-key.mjs`
- Test: `tools/tests/package-signing.test.mjs`

**Interfaces:**
- `createPackageSignature(manifestBytes, metadata, privateKeyPath)` returns signed metadata.
- `verifyPackageSignature(manifestBytes, signatureRecord)` returns a boolean or throws a precise validation error.
- Key creation writes a private PEM and public PEM outside the repo.

- [ ] Write failing tests for valid signature, changed manifest, and wrong owner metadata.
- [ ] Run the focused test and observe the expected failure.
- [ ] Implement the minimal built-in-crypto helpers.
- [ ] Run the focused test and verify all cases pass.

### Task 2: Integrate signing into build and installer

**Files:**
- Modify: `tools/build-antigravity-plugin.mjs`
- Modify: `install-antigravity-portable.ps1`
- Modify: generated installer template within `tools/build-antigravity-plugin.mjs`

**Interfaces:**
- Build reads `MANSOOR_AGENT_SIGNING_KEY` and emits `PACKAGE-SIGNATURE.json`.
- Installer verifies signature metadata and checksum manifest before `agy`.

- [ ] Add build failure when the key is absent, with an explicit setup command.
- [ ] Add signature generation after the canonical manifest is written.
- [ ] Add fail-closed PowerShell verification before strict plugin validation.
- [ ] Build a signed package and inspect its file list for secret absence.

### Task 3: Premium README and release policy

**Files:**
- Modify: `README.md`
- Create: `docs/OWNER_RELEASE_SECURITY.md`
- Modify: `Progress/2026-11-03.md`

**Interfaces:**
- README documents private licensing, owner identity, verified links, installation, signature trust, SEO-friendly positioning, and limitations.
- Security policy documents key custody, GitHub branch protection, signed commits, and rotation.

- [ ] Replace generic copy with premium senior-developer portfolio language without invented claims.
- [ ] Add owner-only release checklist and public-release preparation notes.
- [ ] Verify every URL is intentional and no secrets/claims are present.

### Task 4: Full verification and branch synchronization

**Files:**
- Modify: `KEY-CHECKSUMS.json`

- [ ] Run focused signing tests.
- [ ] Run existing doctor/router tests and doctor checks.
- [ ] Build and strict-validate the signed ZIP.
- [ ] Run a tamper-negative installer test.
- [ ] Refresh checksums, run `git diff --check`, commit, push and verify `main`, `c-development`, `development`, and `mansoor-development` refs.
