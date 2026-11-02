# Agent Quality and Visual Capability Plan

> **For agentic workers:** use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to execute task-by-task.

**Goal:** Improve the single-manager agent with automatically routed, source-grounded UI art direction, realistic image generation, shared backend threat modeling, and maintainable code documentation.

**Architecture:** Add a small set of discoverable skill documents, then connect those skills to the existing `production-orchestrator` and `mansoor-ui-specialist` profiles and backend skill router. Preserve the single-manager topology, consent-based data boundaries, and current provider credentials outside the portable repository.

**Tech Stack:** Antigravity agent Markdown, reusable SKILL.md files, existing Node-based capability router and validation scripts.

**Spec:** User-approved focused UI/backend quality-pack recommendation in the active conversation.

## Global Constraints

- Do not add persistent peer-agent profiles; the production orchestrator remains the sole manager.
- Skill selection stays automatic from task signals and repository evidence; never require users to choose skills manually.
- Image generation uses an available connected tool/provider; do not claim access or embed API keys when unavailable.
- Do not collect or export unconsented project files, prompts, raw chats, customer data, credentials, or hidden chain-of-thought.
- Comments document intent, contracts, side effects, invariants, and non-obvious decisions; do not require comments that merely restate code.
- Use primary official documentation for version-sensitive design, security, model and API claims.
- Update and publish the same reviewed commit to `main`, `c-development`, `development`, and `mansoor-development`.

## Review Focus

- Existing skills overlap: new documents must supply missing triggers and operational contracts rather than duplicate existing style/accessibility checklists.
- Provider/tool mismatch: image generation must degrade into a ready-to-run prompt and setup instructions without fabricating generated output.
- Security overreach: threat modeling must not expand filesystem, Git, telemetry, or credential permissions.
- Manager routing drift: worker skill names, profile references, and README counts must agree with actual files.
- Branch divergence: fast-forward only from the approved implementation commit and preserve unrelated changes.

## Tasks

### Task 1: Add UI art-direction and reference-research skills

**Files:** Create `skills/modern-ui-art-direction/SKILL.md`, `skills/design-reference-research/SKILL.md`.

**Check:** Validate frontmatter, trigger wording, and a sample brief that routes from user intent to evidence-backed direction, visual blueprint, accessibility and responsive criteria. **Status:** complete.

### Task 2: Add image generation skill

**Files:** Create `skills/production-image-generation/SKILL.md`.

**Check:** Verify realistic image brief/prompt templates, image edit/reference preservation, asset format/use, tool availability fallback, current official provider documentation, and secret-safe setup behavior. **Status:** complete.

### Task 3: Add shared secure-design and code-quality skills

**Files:** Create `skills/secure-design-threat-modeling/SKILL.md`, `skills/production-code-quality/SKILL.md`.

**Check:** Exercise cross-stack security routing, abuse-case review, actionable mitigations, useful function documentation, and anti-boilerplate comment rules. **Status:** complete.

### Task 4: Strengthen manager and specialists

**Files:** Modify `agents/Antigravity/custom-agents/production-orchestrator/agent.md`, `agents/Antigravity/custom-agents/mansoor-ui-specialist/agent.md`, `skills/backend-ml-skill-router/SKILL.md`, `skills/autonomous-deep-researcher/SKILL.md`, `tools/route-backend-ml-task.mjs`, and `tools/tests/backend-ml-router.test.mjs`.

**Check:** Confirm automatic routing by signals, bounded parallel delegation, evidence/review gates, image prompt workflow and no redundant user skill selection. **Status:** complete; routing tests include Node, Python, .NET, mixed UI/backend and standalone image tasks.

### Task 5: Update docs, validate and synchronize branches

**Files:** Modify `README.md`; update any capability manifest only if its schema requires new entries (no permission expansion planned).

**Check:** Run existing skill/capability validation and relevant routing checks; review `git diff --check`; ensure four branches point at the same commit; push each branch only after clean verification. **Status:** verification complete; branch publication pending.
