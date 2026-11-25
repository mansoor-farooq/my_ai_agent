# Agent handoff

Read `agent-context/codex-memory/memory_summary.md` first. Then find the matching project rollout summary and use `agent-context/codex-conversation-index.json` or `agent-context/conversation-index.json` to find relevant chats. Read those transcripts for the decisions and flow behind earlier work. Inspect the current project files before changing anything; old chats are historical context.

The `skills/` folders are reusable instructions. `plugin-skill-reference/` contains additional reference skills that may require connectors or accounts. Read the relevant `SKILL.md` before applying a skill. This folder handoff supplies files for any agent, but each agent's native skill discovery and chat import need its own adapter.
