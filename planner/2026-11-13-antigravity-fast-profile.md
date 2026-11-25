# Antigravity Fast Profile — 2026-11-13

## User outcome

Reduce long Gemini 3.8 Flash turns caused by oversized default context,
unnecessary research/skill loading, serial specialist work and repeated image
generation. Preserve the existing provider, APIs, permissions and business
logic.

## Observed constraints

- Antigravity owns the model selector and native `generate_image` call. The kit
  cannot force a paid model, change a plan quota, cancel a host call or rotate
  accounts.
- The manager profile previously preloaded 17 skills, including several deep
  research/security skills that belong on specialists or on-demand paths.
- The manager already selected Fast/Low, but no machine-readable context,
  tool-call or idle-poll budget was returned to the routing plan.
- Repeated image render/analyze calls add latency without improving an exact
  source banner; source reuse should stop generation altogether.

## Implementation

1. `tools/ultra-agent-v3/mode.mjs` now returns bounded budgets. Fast mode uses
   12 context files, 6 skill bodies, 12 tool calls, zero web queries, one
   verification command, one recovery and zero idle polling. A valid parallel
   wave may use 18 tool calls and three workers without raising thinking level.
2. `tools/ultra-agent-v3/plan.mjs` carries the selected budgets into the plan
   envelope so the manager has one dispatch contract.
3. `production-orchestrator/agent.md` now loads 10 default skills, adds
   `efficient-context`, defers deep research/security bodies to specialists,
   and states the Fast budget and host-model boundary explicitly.
4. Source-banner requests use one page fetch and local asset reuse. Existing
   banners do not go through `generate_image`; an unextractable source is a
   blocker instead of an unlimited approximation loop.

## Verification

- RED observed: the new mode tests failed because `budgets` was absent; the
  lean manager test failed because 17 skills were still listed.
- GREEN: mode tests 9/9 and native activity/profile tests 7/7 passed.
- Full suite and package build remain required after the 1.17.0 build.

## Host setup

Select `Gemini 3.8 Flash` with `Low` thinking in Antigravity. The profile uses
`model: inherit` intentionally so it follows the user's selector and does not
silently bypass plan limits. Install the signed 1.17.0 package only after
Antigravity exits; the active host must be reloaded before live latency can be
measured.

## References

- <https://antigravity.google/docs/models>
- <https://antigravity.google/docs/cli/commands/context>
- <https://antigravity.google/docs/subagents>
- <https://antigravity.google/docs/cli/best-practices>
