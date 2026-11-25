# Ultra Agent v4 Local Control Panel Implementation Plan

> Superseded on 2026-11-06: standalone browser panel retired; keep V3 task-state utilities only for recovery and evidence.

> **For agentic workers:** Inline execution. Steps use checkbox syntax.

**Goal:** Add a local browser panel for reading the selected project's Ultra Agent task state.

**Architecture:** A dependency-free Node HTTP server binds to `127.0.0.1`, reads only the selected project's `.agents/ultra-v3/` runtime files, and serves a small static dashboard. A Windows launcher prompts for the project directory and opens the local URL.

**Tech Stack:** Node.js ESM built-ins, HTML, CSS and browser JavaScript.

**Spec:** [2026-11-05-ultra-agent-v4-control-panel-design.md](../specs/2026-11-05-ultra-agent-v4-control-panel-design.md)

## Global Constraints

- No new dependencies or outbound network calls.
- The server binds only to `127.0.0.1`; the panel is read-only.
- Preserve the existing V3 state and trace file formats.
- Package checksums and signature must cover the shipped dashboard files.

## Review Focus

- Path traversal or unsupported HTTP methods cannot expose files outside the chosen project.
- Task text cannot inject markup or script into the page.
- Missing, malformed or empty state files produce visible recoverable UI states.
- Large logs are bounded for responsive loading.
- Installer and README provide a direct, understandable launch path.

### Task 1: Local data server and browser UI

**Files:**
- Create: `tools/ultra-agent-v4-control-panel/server.mjs`
- Create: `tools/ultra-agent-v4-control-panel/public/index.html`
- Create: `tools/ultra-agent-v4-control-panel/public/styles.css`
- Create: `tools/ultra-agent-v4-control-panel/public/app.js`

**Interfaces:**
- CLI: `node server.mjs --dir <project> [--port <port>]`
- HTTP: `GET /api/overview`, `GET /api/tasks/<id>`, and fixed static assets only.

- [x] Implement loopback-only HTTP server, safe project-root file reads, secret redaction, bounded JSONL parsing and host validation.
- [x] Implement responsive task ledger, status counts, selected-task events/checkpoints/traces, empty/error/loading states and five-second refresh.
- [x] Render untrusted values only through text nodes; set restrictive response security headers.
- [x] Run `node --check` on server and browser script files.

### Task 2: Portable launch and package integration

**Files:**
- Create: `Open-Ultra-Agent-Control-Panel.cmd`
- Modify: `package.json`
- Modify: `tools/build-antigravity-plugin.mjs`
- Modify: `tools/agent-hub-doctor.mjs`
- Modify: `README.md`

- [x] Add a launcher that prompts for a project folder and starts the packaged server.
- [x] Add the dashboard files and launcher to portable packaging and checksum manifests.
- [x] Add `npm run control-panel -- --dir <project>` for the source checkout.
- [x] Document double-click and terminal access, the local URL, and stop behavior.
- [x] Inspect the final diff and run `git diff --check`; do not run the test suite unless requested.

