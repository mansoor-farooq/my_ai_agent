# Chat and memory handoff

This package is for continuing project work with the context from earlier agent conversations. It does not fetch projects or change any Git remote.

## Use on the destination agent

1. Install the companion Antigravity skills bundle first. It includes `project-context-orchestrator`, `reverse-engineering` and other user skills.
2. Extract `readable-chat-context.zip` into a private folder. Read `codex-memory/memory_summary.md` first, then read the relevant rollout summary.
3. Search `codex-conversation-index.json` or `conversation-index.json` by the first or last prompt. Read the matching file under `codex-transcripts/` or `antigravity-transcripts/` when the summary is insufficient. Codex transcripts contain the user and assistant dialogue; tool logs and internal reasoning are omitted.
4. `private-chat-history.zip` is a full raw backup of local Antigravity conversation databases, Codex session JSONL, CLI history and memory files. Use it only when a readable transcript or memory summary does not have enough detail.
5. In a new chat, tell the agent: “Read the memory summary and the relevant archived transcript. Inspect the current project files before changing anything. Continue from the documented state and identify what still needs verification.”

The archives are private and can contain confidential project data and previous chat content. Keep them off public Git repositories. Raw conversation databases are included for preservation; importing them into another app profile is not verified. Use the readable transcripts and memory files as the reliable handoff path.
