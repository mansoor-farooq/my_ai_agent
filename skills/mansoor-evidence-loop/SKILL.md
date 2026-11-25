---
name: mansoor-evidence-loop
description: Use when implementation quality depends on proving behavior, not merely producing a plausible diff.
---
# Mansoor Evidence Loop
For each acceptance criterion, collect one observable evidence item: focused test, lint/type check, browser/device observation, report artifact or bounded command output. Separate observed, inferred and blocked states. Never convert a missing tool or skipped check into pass. Keep evidence tied to changed paths and the current revision.

Stop condition: every acceptance item is pass, explicitly blocked, or returned for repair.

