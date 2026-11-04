# Antigravity Expert Agent Team

Date: 2026-11-03

## Goal

Keep `production-orchestrator` as the single manager and build a reusable set of field-specific subagents that select only relevant skills from the user's existing Antigravity library.

## Evidence and constraints

- Current source has 15 portable Antigravity agent profiles. Browser QA and OmniRoute connector profiles were removed because they are outside the requested Gemini expert team. The source skill catalog is not copied into the portable plugin.
- The local Antigravity install reports 273 skill entries across plugins and 160 global skill files; repeated names exist. The supplied image reports 432 breakdowns, but these counts do not establish 453 unique skill definitions. Do not invent the missing skill names or duplicate files to force a count.
- The app's customization panel reports 55,229 skill tokens versus a 20,000-token budget and excludes 249 entries. Adding another flat, always-loaded skill list would worsen the user's issue.
- Keep skills in Antigravity's existing library; organize expertise and delegation in agent profiles instead of copying every skill into a new root.

## Implementation plan

1. Add bounded specialist agents for mobile, .NET, Node, Python, ML, cloud data, workflows, security, QA/release, research/docs and hub operations. (Done.)
2. Give each specialist only the relevant skill references, tight ownership, and concise handoff rules. (Done.)
3. Update the sole manager with an explicit domain routing map and use one specialist by default; add a reviewer only for cross-boundary/high-risk work. (Done.)
4. Update the portable builder and compatibility installer to write only inside this hub; package the team without copying host skills/connectors. (Done.)
5. Run Antigravity strict plugin validation and the E:\Agents-only doctor; record actual agent counts and limits of the skill inventory. (Done: 15 agents, 0 bundled skill bodies/provider connectors; doctor 0 failures/0 warnings.)

## Capability additions

- Every shipped agent declares `skills/reverse-engineering`, `invoke_subagent`, `search_web` and `read_url_content` so reconstruction, bounded research and peer support are available across the team.
- `mansoor-ui-specialist` and `production-orchestrator` additionally expose `generate_image`, gated by an approved asset brief.
- Material UI choices produce a research ledger and approval-ready option matrix before implementation. Backend/security work produces feature documentation and a security case when applicable.
- Legacy provider/gateway/browser connector source was removed from the active hub. The packer still has defensive exclusion rules to prevent accidental repackaging if an old folder is restored from history.

## Safety boundary

Do not delete, disable, or rewrite Antigravity's built-in/installed skills or plugins. Do not raise context limits by copying duplicate skills. The portable kit excludes connector profiles, MCP/provider config, API keys, OAuth and all skill bodies, while allowing bounded `search_web`/`read_url_content` research and approved `generate_image` UI assets. Build/doctor commands may read/write only within `E:\Agents`; installing the finished plugin on a separate target machine remains the user's explicit action.
