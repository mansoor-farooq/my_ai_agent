# Learning Mentor Intelligence Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an automatic, source-grounded Teacher Assistant that teaches any requested topic at the learner's level, supports Sindh curriculum/material discovery, explains decisions, creates roadmaps and tests, and remains usable from native Antigravity and CLI without becoming a second manager.

**Architecture:** Add a deterministic learning-intent router before the general engineering fallback, a dedicated `learning-mentor-specialist` profile, twelve custom teaching skills, and a provenance-aware learning-material registry. Keep lessons/roadmaps/tests project-scoped and redacted; expose only concise native/CLI outputs and handoffs. Add an evaluator harness that checks level appropriateness, evidence, withholding answers, question quality, rationale and teach-back readiness.

**Tech Stack:** Markdown Agent Skills, Node.js ESM modules, JSON artifacts, existing Antigravity manager/router, existing project-memory/evidence ledgers, Node `node:test`, portable package doctor/checksum pipeline.

**Spec:** `docs/superpowers/specs/2026-11-24-learning-mentor-design.md`

## Global Constraints

- Automatic trigger for learning intent; explicit `teacher` command remains optional.
- Mansoor AI Team Manager remains the only manager; the mentor is a specialist.
- Native Antigravity parent chat/sub-agent panel and CLI are the only surfaces; no dashboard or separate panel.
- No raw prompts, hidden reasoning, secrets, customer data, or scraped copyrighted textbook corpus.
- Official Sindh curriculum/textbook sources are linked and indexed with version/grade/subject/source URL; copyrighted material is not redistributed.
- Turbo and Antigravity-selected permissions remain authoritative; teaching is read-only unless a normal manager execution task is explicitly requested.
- Open-source components require provenance, licence and attribution checks; optional remote APIs require explicit credentials and never become silent fallbacks.

## Review Focus

- Mixed Roman Urdu/English voice transcript should trigger teaching without triggering implementation or permissions.
- “Explain this” on a high-stakes or current topic must label evidence, uncertainty and source freshness.
- Sindh textbook links must remain source references rather than copied/repackaged book content.
- A learner asking for code must receive progressive clues and an understanding check before blind copy-paste.
- A later “implement it” must return to the manager's bounded task flow with the lesson decision record attached.

### Task 1: Intent routing and teaching contracts

**Files:**
- Create: `tools/learning-mentor-router.mjs`
- Test: `tools/tests/learning-mentor-router.test.mjs`
- Modify: `tools/premium-agent-router.mjs`

**Interfaces:**
- `detectLearningIntent({ request, transcript = '', files = [] }) -> { matched, mode, signals, confidence, topic }`
- `routeLearningRequest({ request, files = [], changedPaths = [], risk = 'low' }) -> { schema, mode, specialist, skills, requiredEvidence, handoff }`

- [ ] Write failing tests for “samjhao/deep dive/learn karna hai/kyun”, English triggers, mixed coding+learning requests, and non-learning requests.
- [ ] Run `node --input-type=module -e "import('./tools/tests/learning-mentor-router.test.mjs')"` and observe missing-module failure.
- [ ] Implement deterministic trigger normalization and fast/deep mode selection; keep implementation requests routed to the manager after teaching context is attached.
- [ ] Add the learning route before general engineering fallback in `premium-agent-router.mjs`.
- [ ] Re-run focused tests and verify exact route payload and no permission mutation.

### Task 2: Teacher Assistant profile and twelve custom skills

**Files:**
- Create: `agents/Antigravity/custom-agents/learning-mentor-specialist/agent.md`
- Create: `skills/teacher-learner-calibration/SKILL.md`
- Create: `skills/teacher-layered-explanations/SKILL.md`
- Create: `skills/teacher-socratic-dialogue/SKILL.md`
- Create: `skills/teacher-concept-maps/SKILL.md`
- Create: `skills/teacher-source-research/SKILL.md`
- Create: `skills/teacher-open-education-materials/SKILL.md`
- Create: `skills/teacher-decision-rationale/SKILL.md`
- Create: `skills/teacher-roadmap-design/SKILL.md`
- Create: `skills/teacher-guided-coding/SKILL.md`
- Create: `skills/teacher-retrieval-assessment/SKILL.md`
- Create: `skills/teacher-misconception-recovery/SKILL.md`
- Create: `skills/teacher-voice-conversation/SKILL.md`
- Test: `tools/tests/learning-mentor-skill-contract.test.mjs`

**Interfaces:**
- Agent profile declares `mainAgent: false`, `model: inherit`, read/research tools only, and all twelve namespaced skills.
- Each skill has `SKILL.md` frontmatter, a trigger description beginning with “Use when…”, a bounded workflow and a stop condition.

- [ ] Write contract tests that fail when the profile/skills are absent, missing provenance, or expose delegation/permission authority.
- [ ] Run tests to observe RED.
- [ ] Author the smallest reusable skill bodies, adapting the verified Socratic/PEAR pattern and Learning Commons pedagogy without copying protected text.
- [ ] Add learner-level calibration, layered teaching, evidence labels, progressive clues, roadmaps, quizzes, voice commands and redaction rules.
- [ ] Run contract tests and skill quick validation; fix only observed gaps.

### Task 3: Provenance-aware curriculum and materials registry

**Files:**
- Create: `tools/learning-material-registry.mjs`
- Create: `shared/learning/sindh-curriculum-sources.json`
- Create: `shared/learning/source-policy.json`
- Test: `tools/tests/learning-material-registry.test.mjs`

**Interfaces:**
- `createMaterialRecord({ url, title, sourceClass, board, grade, subject, medium, version, licence, accessedAt }) -> record`
- `validateMaterialRecord(record) -> { ok, errors }`
- `findCurriculumSources({ board = 'Sindh', grade, subject, medium }) -> records[]`
- `redactMaterialText(text) -> string`

- [ ] Write failing tests for official DCAR links, STBB eBook links, Apache/MIT open-source sources, missing licence, and copyrighted-content rejection.
- [ ] Implement source classes (`official-curriculum`, `official-textbook-link`, `open-skill`, `user-provided`, `optional-api`) and deny redistribution when rights are unknown.
- [ ] Seed only source URLs and metadata from the researched DCAR/STBB pages; do not download or embed textbook corpus.
- [ ] Add deterministic subject/grade/medium lookup and version-aware records.
- [ ] Run registry tests and provenance/secret scans.

### Task 4: Learning artifacts, roadmap and test loop

**Files:**
- Create: `tools/learning-artifacts.mjs`
- Create: `tools/learning-evaluators.mjs`
- Test: `tools/tests/learning-artifacts.test.mjs`
- Test: `tools/tests/learning-evaluators.test.mjs`

**Interfaces:**
- `createLessonArtifact({ projectId, topic, learnerLevel, explanation, evidence, decisions, nextStep }) -> lesson`
- `createRoadmapArtifact({ projectId, goal, learnerLevel, prerequisites, milestones }) -> roadmap`
- `createLearningTest({ lesson, questionCount = 3 }) -> test`
- `evaluateTeachingResponse({ response, learnerLevel, evidence, expected }) -> { score, findings, pass }`

- [ ] Write failing tests for stable project-scoped IDs, redaction, resumability, one-to-three voice questions, and no filesystem writes for read-only teaching.
- [ ] Implement JSON-safe artifacts under project-scoped `learning/` paths, using existing identity/evidence conventions.
- [ ] Implement local evaluator dimensions: grade/level appropriateness, evidence/uncertainty, withholding answers, supportive tone, decision rationale, concept coverage and teach-back readiness.
- [ ] Add optional adapters for Learning Commons rubric concepts without requiring API credentials.
- [ ] Run artifact/evaluator tests and verify malformed or cross-project artifacts fail closed.

### Task 5: Native manager/CLI integration and handoff

**Files:**
- Modify: `agents/Antigravity/custom-agents/production-orchestrator/agent.md`
- Modify: `tools/ultra-agent-cli.mjs`
- Modify: `tools/ultra-agent-v4/mcp-server.mjs`
- Modify: `tools/ultra-agent-v5/control-plane.mjs`
- Test: `tools/tests/learning-mentor-integration.test.mjs`

**Interfaces:**
- Add read-only MCP `teach_topic` and `get_learning_artifact` tools; implementation remains manager-owned.
- Add CLI `teach`/`learn` commands that call the same router/artifact contract.
- Control-plane handoff adds optional `learning` metadata: mode, topic, lessonId, roadmapId, testId, evidenceRefs, nextQuestion.

- [ ] Write failing integration tests for automatic native route, CLI route, roadmap/test creation, artifact retrieval, and implementation handoff.
- [ ] Implement manager routing and concise native activity milestones; keep all writes and external effects under existing policy.
- [ ] Add CLI output modes for voice-friendly concise response and detailed document response.
- [ ] Add MCP read-only tools with project identity checks and no arbitrary filesystem exposure.
- [ ] Run integration tests and regression tests for hooks, Turbo, control plane and permissions.

### Task 6: Package, doctor and acceptance verification

**Files:**
- Modify: `tools/build-antigravity-plugin.mjs`
- Modify: `tools/agent-hub-doctor.mjs`
- Modify: `tools/tests/persistent-runtime-package.test.mjs`
- Modify: `build-agent-hub.ps1`
- Modify: `README.md`
- Modify: `KEY-CHECKSUMS.json`

- [ ] Add mentor profile, twelve skills, learning modules, source metadata and evaluator modules to the portable package.
- [ ] Add doctor checks for manager-only ownership, skill count, provenance and source policy.
- [ ] Run focused package build in elevated host context because Windows child-process tests can hit sandbox `spawn EPERM`.
- [ ] Confirm doctor has zero failures, strict package validation passes, and focused suite includes all learning tests.
- [ ] Verify the final ZIP contains no scraped textbook corpus, secrets, or provider credentials.
- [ ] Commit and push only after the complete suite and package checks are green.

