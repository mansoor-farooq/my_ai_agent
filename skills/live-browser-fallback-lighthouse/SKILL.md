---
name: live-browser-fallback-lighthouse
description: Use when a user requires live website testing and final Lighthouse auditing, including fallback setup of a project-local Chromium browser when host browser tools are missing.
---

# Live Browser Fallback and Lighthouse Gate

For an authorized URL, complete real browser testing through an available provider, falling back to an isolated Chromium installation when needed. Lighthouse is the final required step after functional and visual checks pass; a Lighthouse score never replaces those checks.

## Provider ladder

1. Use the host's native live browser (Antigravity `/browser`, Codex CUA, or an exposed browser MCP) when available.
2. Use an already installed Playwright CLI, project Playwright runner, Chrome, Edge, or Chromium. Prefer the project's existing runner.
3. If no provider works, and live browser testing is authorized, provision an isolated project-local Playwright + Chromium runtime. First check whether dependencies are already installed. If missing, use the project package manager and lockfile when possible; otherwise install only in a temporary task directory, never globally. Record the exact packages and versions. Launch an isolated headless Chromium session for deterministic checks and use a visible native browser provider if the user needs to watch the session.
4. If installation or launch is blocked by network, permissions, OS dependencies, or environment policy, report the exact blocker and do not describe HTTP checks as browser testing. Continue with source/HTTP checks only as supplementary evidence.

Do not attach to the user's normal browser profile or reuse its cookies. Do not bypass host permission controls, access restrictions, authentication, or environment boundaries. Test only the authorized URL and flows; never submit real payments or destructive production actions.

## Required execution order

1. Record the URL/environment, routes, role/fixture, viewport, mutation scope and provider. Use the live-web-quality-auditor preflight and safety rules.
2. Run functional and UI checks in an isolated browser. Capture readiness, navigation, screenshots, console errors, failed requests and key responsive states. Keep actions within the authorized audit scope.
3. Finish and classify all requested functional/browser scenarios, including failures. Never call the overall audit passed while a required scenario failed.
4. Always run Lighthouse last for every scenario where a browser can open the page, even when a functional scenario failed. Use the same representative routes and recorded viewport/device conditions, and run it after all interactive checks. Prefer the project-installed Lighthouse runner; otherwise use Playwright's Lighthouse integration if already present, then a temporary local Lighthouse CLI. Do not silently upload private pages or authenticated data to hosted services. If the browser cannot open the page, record Lighthouse as blocked rather than substituting a different audit.
5. Save the Lighthouse JSON/HTML report with the other approved artifacts. Report Performance, Accessibility, Best Practices and SEO scores, Core Web Vitals/lab metrics where the report provides them, plus the key opportunities and diagnostics. Clearly label lab data; do not claim field data without a field source.

## Final report

Report provider and version, environment/routes, viewport and conditions, browser scenario pass/fail/block counts, console/network findings, Lighthouse artifact and category scores, top actionable findings, and any installation or coverage gap. A failed scenario or missing mandatory Lighthouse result means the audit is not fully passed.
