# Parallel Specialist Fast Path — Implementation Plan

## Goal

Make Mansoor AI Team Manager split genuinely independent work into bounded
parallel specialist waves, with visible assignments/progress and no duplicate
image-generation loops.

## Observed problem

The user's Antigravity screenshot shows repeated image update/render/analyze
steps for one banner, but no visible worker assignments or concise milestones.
The current manager defaults to one implementation specialist, while the
delegation scheduler already supports dependency-safe waves capped at three.
The current Fast profile also hard-codes one specialist, so explicit parallel
work cannot use that existing scheduler without switching to the slower
Premium profile.

## Design decisions

1. Keep routine work Fast. An explicit parallel request or at least two
   independent planned work items can raise Fast execution capacity to at most
   three specialists; this does not trigger deep research or provider changes.
2. The manager must create a concrete work-item list before dispatch. Each item
   has one role, deliverable, owned paths, read-only flag and dependencies.
   `tools/ultra-agent-v3/delegation.mjs` remains the single scheduling source.
3. Parallel execution is valid only when a scheduled wave has more than one
   worker. Overlapping writes are serialized; missing/cyclic dependencies
   block. If the task has no independent items, the plan falls back to one
   specialist and says why.
4. Complex image work may parallelize independent source-asset discovery,
   app-integration inspection/implementation with fixed paths, and other
   read-only checks. Only one worker owns the final banner; duplicate image
   generation is never used as a speed strategy.
5. Parent chat shows a compact plan before work, then assignment, phase
   milestone, blocker and handoff updates. Repeated image render/analyze loops
   stop after one inspection unless a specific defect remains; at most one
   targeted local correction follows. Native generation stays limited to two
   total calls per asset and is never retried while unresolved.
6. Keep the same inherited Gemini model, current project APIs and existing
   tool/permission boundaries. No dependency is added.

## Files

- Modify `tools/ultra-agent-v3/mode.mjs` for explicit/inferred parallel intent.
- Modify `tools/ultra-agent-v3/plan.mjs` to report the actual parallel decision,
  bounded execution profile, waves and fallback reason.
- Test in `tools/tests/ultra-agent-v3-mode.test.mjs` and
  `tools/tests/ultra-agent-v3-delegation.test.mjs`.
- Update `agents/Antigravity/custom-agents/production-orchestrator/agent.md`
  and `skills/production-image-generation/SKILL.md` with parallel work-item,
  progress, and bounded image-review behavior.
- Bump portable package to 1.16.0 in `package.json` and
  `tools/build-antigravity-plugin.mjs`; test packaged policy/helper contents.
- Record verification in `planner/2026-11-13-v5-status.md`.

## Acceptance checks

- Ordinary one-file fix stays Fast with one specialist.
- Explicit parallel request with three disjoint tasks stays Fast and schedules
  three workers in one wave.
- Two independent work items infer parallel capacity without special keywords.
- Same-path writes serialize; dependency work starts only in a later wave.
- A parallel request without executable independent work reports a single-owner
  fallback instead of pretending that agents ran concurrently.
- Image instructions allow independent discovery/integration workers but keep
  one final asset owner, one visual inspection, and one targeted local revision.
- Assignments and milestones are required in the Antigravity parent chat; the
  manager reports actual native worker status only.
- ZIP 1.16.0 includes the updated manager/skill and passes tests, Doctor and
  owner-signature verification. Install/reload remains a separate host action.

## Implementation checklist

- [x] Add failing mode/planner tests for bounded Fast parallelism and fallback.
- [x] Run focused tests to confirm the expected failures.
- [x] Implement the smallest mode and plan changes.
- [x] Update manager and image workflow instructions.
- [x] Run focused and full tests, Doctor, package contents and signature checks.
- [x] Build the 1.16.0 portable ZIP without changing the active Antigravity app.
- [x] Update status with observed results and remaining host-install boundary.

## Implementation and verification — 2026-11-13

- `mode.mjs` keeps independent parallel work in Fast/low-thinking mode and
  caps it at three workers; a one-item task remains single-owner.
- `plan.mjs` emits dependency-safe waves, a `parallelPlan` status/fallback
  reason and a bounded execution profile. Same-path writes are serialized.
- The manager now requires an explicit work-item graph, concurrent native
  subagent invocation for a genuinely parallel wave, and short parent-chat
  updates at assignment/wave/milestone/blocker/handoff points.
- Image work has one final-asset owner, permits independent read-only
  discovery/integration work, caps native generation at two calls per asset,
  and allows at most one local correction after inspection. It does not claim
  control over Antigravity's provider latency or cancellation.
- Focused tests: mode 7/7, delegation 6/6, native activity contract 5/5 and
  image helper 7/7 passed. Full `npm test`: 239 tests, 233 passed, 0 failed,
  6 PostgreSQL RAG tests skipped by the default gate.
- `npm run build:package`: Doctor 20/20, source checksums 507/507, focused
  release tests 198 total / 192 passed / 0 failed / 6 expected RAG skips.
- Portable contents test passed. Extracted ZIP owner Ed25519 signature passed;
  version and updated manager/image workflow were confirmed in the archive.
- Artifact: `dist/mansoor-agent-hub.zip`, version `1.16.0`, SHA-256
  `4642E0D9CDC63C0192041061BCD718F867F6F5008F3292343D73B024812BE7A9`.
- Ready-to-run extraction: `dist/mansoor-agent-hub-1.16.0/`; its installer and
  embedded signature were checked against the versioned package.
- Package-only build used `-SkipAutoInstall`; active Antigravity was not
  changed. Close Antigravity and install this exact ZIP on each target PC to
  load the new profile/skills. Native parallel dispatch and speed improvement
  still need an observed Antigravity task run; no percentage is claimed.
- Official Antigravity subagent documentation says the parent can invoke
  multiple concurrent sessions. Native provider image-call duration remains
  host-managed: <https://antigravity.google/docs/subagents>.
