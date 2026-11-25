---
name: project-context-orchestrator
description: Maintain compact, evidence-based project memory and route existing-project work through targeted discovery, implementation, and verification. Use automatically for unfamiliar or long-lived repositories, repeated sessions, architecture work, Flutter/mobile changes, debugging, and cross-cutting feature requests.
---

# Project Context Orchestrator

Keep the agent fast without making it guess. Build a small project memory once,
validate it at the start of later tasks, and read only the changed or affected
parts of the repository.

## Start with memory, not a full reread

1. Read repository instructions and security boundaries.
2. Look for `.agents/memory/` and read `project-map.md`, `decisions.md`,
   `change-log.md`, and `open-questions.md` only when present.
3. Validate the memory header against the current branch/revision and inspect
   the working-tree diff, manifests, lock files, generated-code markers, and
   recent commits.
4. If memory is current, follow its file/module index and inspect only the
   target flow plus callers, consumers, tests, and configuration it names.
5. If memory is missing, stale, contradictory, or a dependency/configuration
   boundary changed, rebuild the smallest useful map before editing.

## Bootstrap and refresh project context

- On the first task in a project, run the bundled
  `node <hubRoot>/tools/project-context-bootstrap.mjs prepare --dir <repo> --project <name> --query "<short task keywords>" --max-symbols 80`.
  It initializes missing `.agents/memory/` files without overwriting existing
  notes, builds a compact source/symbol index, writes one replaceable managed
  section in `project-map.md`, and returns a small task-focused packet.
- On later tasks, use the same command. It checks source metadata and rereads
  only changed or newly indexed files; deleted paths leave the index. The
  context-packet cache includes the current working-tree fingerprint, task
  focus and symbol budget, so an uncommitted source edit cannot reuse the old
  packet.
- Keep `--query` short and specific. The raw query is used only for ranking and
  cache identity; it is not written into project memory. Do not store prompts,
  hidden reasoning, credentials, customer records or unrelated chat history.
- Read the ranked target files, affected callers/consumers and relevant tests
  directly before editing. Use focused ranges when a large file is involved.
  A map hit is navigation help, not source proof. Use `--force-map` after a
  branch switch, generated-code refresh, unexplained mismatch or when metadata
  may be unreliable; re-check security, money, permission, persistence and
  destructive boundaries from live source regardless of cache state.
- After a material task, append a concise evidence-backed status/change note
  with changed paths and checks. The next task's prepare command refreshes the
  compact map without rewriting owner-authored notes.

Read [references/incremental-refresh.md](references/incremental-refresh.md) for
the invalidation decision table and [references/memory-schema.md](references/memory-schema.md)
for the compact record format.

## Maintain the memory contract

- Record facts separately from strong inferences and unknowns.
- Include the repository revision, branch, generated-at time, and inspected
  scope in every update.
- Keep entries short and point to exact files/symbols rather than copying code.
- Store architecture decisions, stable conventions, test commands, open
  questions, and the last verification result; do not store full source files.
- Redact tokens, passwords, cookies, private keys, customer records, and raw
  payload values. Keep field names and relationships when they help reasoning.
- Update only the sections affected by the task. Do not rewrite the whole
  memory file for a one-file change.
- Treat memory as a cache of evidence, never as an authority. Re-check claims
  that affect security, money, persistence, public APIs, or irreversible work.

## Ask better questions

Ask a question only when the answer could change the design, data contract,
permissions, migration, or user-visible behavior. Infer ordinary details from
the repository and state the assumption. Ask the smallest useful set, then
record the answer or assumption in `open-questions.md` or `decisions.md`.
Never ask again for a fact already verified in memory or source.

## Route work by risk and independence

- Small local fix: work directly after a focused flow trace.
- Cross-cutting or ambiguous change: use Mapper -> Builder -> Verifier.
- Mapper is read-only and returns affected files, contracts, assumptions, and
  tests to run.
- Builder edits only the agreed scope and preserves existing patterns.
- Verifier is read-only with respect to product code; it runs focused tests,
  analyzer/build checks, and a diff review.
- Run parallel work only for independent read-only investigation or tests.
  Keep edits to the same files sequential.
- Do not spawn agents to make a small task look advanced. More context windows
  do not replace evidence or model capability.

## Flutter and mobile routing

For Flutter/mobile work, compose with the available Flutter UI and
reverse-engineering skills. Reuse the project's theme, state, navigation, API,
and test patterns. Check responsive layouts, text scaling, loading/empty/error
states, accessibility, and performance when the changed flow touches UI. Do not
load the full UI playbook for an unrelated backend or documentation task.

## Completion checkpoint

Before reporting completion, update the affected memory sections with the new
revision and verification evidence, list unresolved unknowns, and state what
was not checked. Never claim that a test, build, runtime request, or visual
check passed without observing its result.
