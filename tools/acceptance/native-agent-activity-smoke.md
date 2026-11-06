# Native Agent Activity Smoke Check

**Date:** 2026-11-06 (Asia/Karachi)
**Status:** BLOCKED for automated native UI capture; standalone dashboard retirement explicitly approved by the user because the local panel was not the required live activity surface.

## Scope and safety

- Intended check: use Antigravity's native UI on a temporary read-only fixture to observe one delegated research sub-agent, parent-chat updates, and the native sub-agent detail panel.
- The live `sales_agent` project was not opened, changed, or used for this smoke check.
- A temporary README-only fixture was created and then removed.
- The existing active Antigravity conversation was not switched, stopped, or sent a message.

## Observation

The Antigravity accessibility tree was readable, but Windows screenshot capture timed out twice. The automation could not safely interact with the app or verify the native sub-agent panel. No test prompt was submitted and no sub-agent was launched.

## Decision

Do not claim automated native-panel acceptance. The user-approved `1.7.2` release retires the standalone dashboard and launcher; native activity remains host-controlled and is reported only when observed in Antigravity.

## Next check

Retry the same read-only smoke on a temporary project through the Antigravity UI automation when window capture works. Verify assignment and completion messages in the parent conversation and running/completed worker details in the native panel. If the panel is unavailable, stop and propose a reviewed native fallback; do not silently reinstate a separate web dashboard as the live activity view.

Context-load follow-up: the retired 1.7.2 package exposes compact skill routers and keeps full skill bodies in skill-library/; native UI acceptance remains separately blocked by the earlier capture timeout.
