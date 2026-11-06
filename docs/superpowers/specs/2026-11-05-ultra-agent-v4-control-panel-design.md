# Ultra Agent v4 Local Control Panel

> Superseded on 2026-11-06: the standalone browser panel was retired after it was confirmed to mirror only a separately selected project's persisted task files, not live Antigravity activity. The native parent chat and sub-agent panel are the supported activity surface.

## Intent

Give the owner a browser-based way to inspect real task state for one selected project while the Antigravity manager continues running. The panel is launched on demand from the portable package and opens at a local address.

## Goals

- Show tasks, lifecycle status, recent events, checkpoints and execution traces from the selected project's existing `.agents/ultra-v3/` files.
- Make the panel available through a double-click Windows launcher included in the signed ZIP.
- Keep the runtime dependency-free and limit network access to IPv4 loopback.
- Render all persisted task text as data, with safe error, empty and loading states.

## Non-goals

- No hosted service, remote access, project discovery outside the folder chosen by the user, or task mutation controls.
- No changes to agent lifecycle, state formats, model routing, credentials, or existing business logic.

## Approaches

1. Keep CLI commands only: smallest change, but does not provide the requested panel.
2. Add a local read-only browser dashboard over the existing files: selected; it gives the requested visual access without changing the control-plane data contract.
3. Add a hosted or remotely accessible dashboard: unnecessary deployment, identity and security surface for a local-first agent runtime.

## Design

- The user supplies one project path to the launcher. The server binds only to `127.0.0.1`, reads only that project's `.agents/ultra-v3/` tree, and serves a fixed set of static assets and JSON endpoints.
- A task list shows state, identifier and last update. Selecting a task reveals its lifecycle events, checkpoints and trace records. Refresh occurs every five seconds and on demand.
- No write endpoints are exposed. Only Node built-ins are used. Paths are fixed beneath the selected project root; invalid task identifiers are rejected. Browser rendering uses text nodes for persisted data.
- The existing runtime keeps its `ultra-agent-v3` directory for compatibility; the dashboard is a V4 addition.

## Visual direction

- Palette: graphite `#171C20`, panel slate `#242C31`, divider `#39454A`, warm paper `#E8ECE7`, sea-glass `#86C9BB`, amber `#D6A45D`.
- Type: native system sans for readable interface text; system monospace only for task IDs, timestamps and event codes.
- Layout: left-aligned page header and project context above a compact status strip, a wide task ledger on the left and a selected-task detail rail on the right; collapse to a single column on narrow screens. No chart cards or decorative gradients.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Ultra Agent     Project: chosen folder                Local / 127.0.0.1 │
├──────────────────────────────────────────────────────────────────────┤
│ Active  2       Complete  8       Recoverable  1       Updated 10:42  │
├────────────────────────────────┬─────────────────────────────────────┤
│ Task ledger                    │ Selected task                       │
│ id · state · updated           │ lifecycle · checkpoints · traces   │
└────────────────────────────────┴─────────────────────────────────────┘
```

## Acceptance

- The ZIP contains the server, browser assets and launcher; strict package checksum signing covers each file.
- The server refuses non-loopback binds, invalid paths and unsupported routes, and shows a useful empty state when no task data exists.
- README explains how to launch the panel and select a project.
