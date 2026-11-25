---
name: mansoor-premium-local-tool-routing
description: Use when a local model must choose repository, shell, browser, test, retrieval, or artifact tools under a governed permission boundary.
---

# Local tool routing

Expose only the smallest allowlisted tool set for the current stage. Use read-only inspection before writes, manager-approved commands for mutations, and explicit browser/Lighthouse gates for live web work. Return structured tool results instead of raw unbounded logs.

Stop when every requested action has an owner, scope, and verification command.
