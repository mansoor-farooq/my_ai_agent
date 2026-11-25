---
name: audit-browser-smoke
description: Use when a live website needs reproducible browser navigation, console/network capture, interaction checks, or route smoke evidence.
---
# Browser smoke audit
Use the available Antigravity browser, Playwright runner or approved fallback in that order. Capture readiness, screenshot, console, network failures and observable state after each meaningful action. Keep actions read-only unless an explicit disposable fixture authorizes mutations.

Stop condition: requested flows pass, fail, or are explicitly blocked with evidence; never infer a pass from navigation alone.
