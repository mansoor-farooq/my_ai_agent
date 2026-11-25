# Ultra Agent V4 Native Activity Experience

## Status

Proposed design for user review. This document describes the approved direction requested by the user; implementation remains gated on review of this spec.

## Intent

Make Ultra Agent's manager and specialist work visible in the Antigravity conversation and its native sub-agent panel. The user should see which specialist the manager assigned, the bounded task, current state, meaningful progress, blockers, and a concise result. Per-project memory and research-first feature proposals must make repeat work coherent without restructuring the user's application.

The standalone Ultra Agent browser dashboard is not the product direction. It reads persisted task-ledger files and is not Antigravity's live sub-agent surface. Remove it from a future package only after the native activity acceptance check passes on the user's installed Antigravity app.

## Current evidence

- The installed `mansoor-agent-hub` plugin is enabled at version `1.6.1`; the local Antigravity CLI reports `1.5.0`.
- The selected `sales_agent` project currently has no `.agents/ultra-v3/tasks/` directory, so the browser panel has no task records to show.
- The existing panel reads local Ultra Agent task state, checkpoints, and traces. It does not subscribe to Antigravity's live sub-agent sessions.
- The production orchestrator already declares native `invoke_subagent` and provides a manager-led 15-agent roster.
- Official Antigravity documentation describes an IDE side panel with step-by-step progress and edited files; native sub-agent monitoring in the App/CLI; and project-scoped folders/settings. See Sources.

## Goals

- Show assignments and useful progress in the user's active Antigravity conversation.
- Let the user open the native sub-agent panel to inspect, follow, or stop workers and read their task conversations.
- Keep the single-manager model: the manager chooses only the relevant specialist(s) from the existing 15-agent team.
- Keep durable, compact memory scoped to each project and validate it before repeat work.
- For material feature requests, research the project and current market before proposing implementation; give evidence, options, differentiation, risks, and a recommendation before changing code.
- Preserve the existing application structure, routes, API/data contracts, and user workflow. No broad restructure, migration, or unrelated cleanup without explicit approval.
- Pause safely on missing access or quota limits and resume from a checkpoint using supported account and provider rules.

## Non-goals

- A separate browser dashboard, hosted control plane, remote telemetry service, or shadow agent runtime.
- Showing hidden chain-of-thought or every internal model token. Visibility is task-oriented: assignment, observable state, useful milestones, outputs, changed files, checks, and blockers.
- Spawning all 15 agents for every request or paying for an additional orchestration tier by default.
- Automatically switching identities or credentials to bypass a provider's quota or plan limits.
- Reorganizing the user's application or changing business behavior as a side effect of adding agent observability.

## User experience

### Before delegation

The manager posts a short team update in the same conversation, for example:

> Team for this task: Manager — scope and project memory; Research Specialist — read-only competitor/source review; UI Specialist — implementation proposal. Each worker has a narrow scope and a stated deliverable.

Only agents actually selected for the task are listed. Routine fixes use the fast path and do not produce a research team announcement.

### During work

- Antigravity's native sub-agent panel is the source of live worker state and worker conversations.
- The manager posts a chat update when delegation starts, a meaningful milestone completes, a worker is blocked, or a result is ready. Avoid repeated polling/status spam.
- Every worker handoff summarizes: assignment, status, useful findings, files changed (if any), checks actually run, and unresolved issues.
- The manager retains ownership of integration, approvals, and final verification.

### Project selection and memory

Use Antigravity's existing Project/workspace selection as the project selector; do not make a second project picker. Keep project memory in the existing project-local `.agents/memory/` contract when available. Record compact architecture facts, decisions, active goals, and constraints; validate repository identity and freshness before use. Never copy memory from one project into another or store credentials, raw private chats, or hidden reasoning.

### Research-first feature gate

For a material feature or product direction, before implementation the manager provides a short research brief in chat:

1. What the current project already does and which contracts the feature touches.
2. Relevant competitors or adjacent products, supported by current primary sources.
3. Two or three viable options, their user value, cost/risk, and fit with existing architecture.
4. Recommended differentiation and acceptance criteria.
5. A clear wait point for the user's approval before implementation.

Routine, bounded fixes and operational tasks stay fast; they do not trigger unnecessary market research. Security, payment, data migration, production release, and other high-risk work always use the deep path.

## Approaches considered

1. **Native Antigravity panel plus manager chat updates — selected.** Reuses Antigravity's supported custom sub-agent UI, existing plugin roster, and project/workspace context. It preserves the user's preferred chat flow and avoids an independent dashboard/runtime.
2. **Standalone local browser dashboard — rejected.** The existing implementation is a task ledger over persisted files; it cannot show live sub-agent work unless the project is separately instrumented, and the user does not want a separate dashboard.
3. **A new transcript-polling web app or provider bridge — rejected.** It adds another UI/runtime, depends on internal transcript details, creates privacy and compatibility risk, and is unnecessary if the native panel works.

## Architecture and boundaries

- Keep `production-orchestrator` as the sole manager and use Antigravity's native `invoke_subagent` for the installed custom specialists.
- Standardize concise, observable assignment and handoff messages in the manager contract. Do not claim a live status unless it was observed in the native UI/tool result.
- Keep existing Ultra Agent task state as a local recovery/audit mechanism only if it still adds value; it is not the user-facing activity surface. State writes must be project-scoped and contain safe summaries, not raw conversations.
- Do not add network services, API-key gateways, account rotation, transcript scraping, or new dependencies for the native activity experience.
- Use the platform's project-scoped settings and the existing memory files. Changes to product repositories remain bounded to the requested files. Any change that needs an application-wide restructure, new database, route/API migration, or broad permission expansion must return as a proposal first.
- Quota interruption is a recoverable state: save a checkpoint, state what remains, and resume after the platform allows it. Account changes remain user-controlled and subject to provider terms.

## Rollout and dashboard retirement

1. On a safe, read-only sample task, verify that the user's installed Antigravity app shows the custom specialist in its native panel and that the manager can post useful assignment and completion updates in the parent conversation.
2. Verify one multi-specialist task with distinct read-only scopes; do not modify the user's live `sales_agent` task for this acceptance check.
3. Verify project memory remains tied to the selected project and is not copied across projects.
4. If the native panel does not expose worker status/conversations in the installed app, stop and report the exact platform limitation. Do not quietly replace it with another dashboard; present the smallest native/manager-chat fallback for review.
5. After acceptance, remove the local browser panel and launcher from the next Agent Hub package, source package allowlists, README, doctor checks, checksum entries, and panel-only tests. Keep any required V3 task-state utilities only if they serve resume/evidence workflows independently.
6. Publish a signed replacement package only after the agreed checks pass. Installing/restarting Antigravity is a separate operational step; do not interrupt a live user task.

## Acceptance criteria

- In the installed Antigravity App, a manager-delegated read-only task visibly appears in the native sub-agent panel with a usable worker conversation/detail view.
- The parent chat receives a clear assignment announcement and a concise completion/blocker update without the user needing a separate browser.
- Only task-relevant specialists are selected; assignments contain a bounded scope and deliverable.
- Feature requests produce an evidence-linked research/options brief before the first product-code edit.
- The manager reads only the selected project's fresh memory, and the test leaves the application source tree unchanged except for approved `.agents/` metadata.
- A quota or worker failure leaves the task resumable and reports the precise blocker; it does not switch credentials automatically or claim success.
- The standalone dashboard is removed after native activity is the agreed product surface and the user approves retirement; automated native-panel capture may remain a documented limitation.
- No hidden reasoning, secrets, raw conversation transcripts, or unrelated project data are included in progress messages or persisted state.

## Risks and open questions

- The official product documentation describes native sub-agent panels, but the exact UI on the user's installed Antigravity App build still needs a safe local acceptance check. CLI version `1.5.0` alone does not prove the desktop UI version or every panel behavior.
- Native UI state is controlled by Antigravity. The plugin can ensure clear parent-chat summaries and correct native delegation, but it must not promise an inline stream of every worker tool call if the host does not expose that feature.
- The native `/teamwork` orchestrator is an optional platform feature and may require a paid plan; this design does not depend on it or replace the existing 15-agent manager with it.
- Project memory should remain concise and evidence-based. Large chat archives or automatic cross-project memory would violate the privacy and project-boundary goals.

## Sources

- Google Antigravity, [Custom subagents](https://antigravity.google/docs/subagents?tab=cli): native delegation and sub-agent monitoring.
- Google Antigravity, [IDE agent side panel](https://antigravity.google/docs/ide/agent-side-panel): conversation progress and changed files.
- Google Antigravity, [Projects](https://antigravity.google/docs/projects/): project folders, settings, and isolated worktrees.
- Google Antigravity, [Hooks](https://antigravity.google/docs/hooks): native lifecycle extension points; not used as a substitute UI.
- Google Antigravity, [Teamwork](https://www.antigravity.google/docs/teamwork/): parallel agent tracks, progress artifacts, and isolation patterns; optional/plan-gated.
- OpenAI, [Codex app](https://openai.com/index/introducing-the-codex-app/): project-organized agent threads, worktrees, and diff review.
- Cursor, [Background Agents](https://cursor.com/docs): separate remote agent sessions and monitoring; adjacent competitor pattern, not the recommended architecture here.
