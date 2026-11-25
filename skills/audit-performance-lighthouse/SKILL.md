---
name: audit-performance-lighthouse
description: Use when measuring live page performance, Lighthouse categories, lab Core Web Vitals, resource timing, or performance regressions.
---
# Lighthouse performance gate
Record browser/version, URL, viewport, throttling, cache state and timestamp. Run Lighthouse after scenario checks, save JSON/HTML/trace artifacts, and compare only equivalent settings. Use Lighthouse as a mandatory final gate, not as the only audit.

Stop condition: final Lighthouse result is saved and its category findings are linked to the report, or the gate is visibly blocked.
