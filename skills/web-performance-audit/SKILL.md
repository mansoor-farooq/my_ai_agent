---
name: web-performance-audit
description: Use when auditing or improving website performance, Core Web Vitals, Lighthouse results, loading speed, rendering, or resource bottlenecks in a live browser or codebase.
---

# Web Performance Audit

Produce a repeatable, evidence-backed performance report for authorized websites. Separate browser lab measurements, field data, source inspection, and hypotheses. Never promise ranking or conversion gains from a score alone.

## Workflow

1. Identify the authorized URL/environment, routes, available browser provider, viewport, and whether code edits are in scope. Use a real browser when available; otherwise state that the audit is static or HTTP-only.
2. Capture a baseline on representative routes. Record device/viewport, throttling, browser/tool version, cache state, timestamp, navigation readiness, and Lighthouse/trace artifact path when available. Repeat noisy lab runs three times and report the median; never compare runs with different settings as if equivalent.
3. Inspect Core Web Vitals (LCP, INP, CLS) only from a source that actually provides them. Label Lighthouse/DevTools values as lab data and CrUX/analytics as field data. Do not invent field metrics.
4. Attribute bottlenecks to evidence: server/TTFB, render-blocking CSS/JS, long tasks, hydration, fonts, image dimensions/format/priority, caching/compression, third-party scripts, layout shifts, and mobile network behavior.
5. Rank findings by measured impact, confidence, affected route breadth, and effort. Prefer the smallest shared-template or asset fix. Preserve behavior, accessibility, SEO semantics, and tracking requirements.
6. After an authorized fix, rerun the same route and conditions, plus one adjacent route. Compare raw values and artifacts; explain noise and any tradeoff.

## Report shape

- Scope and environment
- Measurement method and conditions
- Baseline metrics with lab/field labels
- Findings: severity, route, evidence/artifact, likely cause, recommendation
- Implemented changes and exact before/after measurements, if edited
- Unmeasured areas and next verification

Do not claim a full-site crawl from a few representative pages. Do not use a single Lighthouse score as the diagnosis. Do not install new tooling or upload site data to a third party without authorization.
