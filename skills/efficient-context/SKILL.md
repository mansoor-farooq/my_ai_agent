---
name: efficient-context
description: Use when a coding task spans a large repository, a long conversation, several independent work areas, or risks excessive file reading, repeated searches, duplicated explanations, or unnecessary agent work.
---

# Efficient Context

Protect context for decisions and implementation.

- Start from project instructions, the user's acceptance criteria, and current changes.
- Search filenames and symbols first. Read only relevant ranges; widen only when evidence requires it.
- Keep one compact task list. Record decisions, discovered paths, commands, and unresolved risks once; update rather than restate them.
- Delegate only independent work whose saved context exceeds coordination cost. Give each agent a narrow deliverable and request a concise result with file paths and evidence.
- Prefer existing scripts, components, and project commands. Run helpers with `--help` before reading their source.
- Test changed behavior first. Broaden checks only when risk, failures, or project policy justifies it.
- Summarize large outputs and logs around the actionable failure. Never claim success from truncated or missing output.
- Stop exploring once there is enough evidence to act safely. Re-open context only when implementation or verification reveals a new question.

Final responses should state outcomes, verification, and material limitations without replaying the work log.
