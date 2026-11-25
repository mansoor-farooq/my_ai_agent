---
name: chromium-browser-engineering
description: Use Chromium through the installed Antigravity browser or Chrome DevTools plugin for evidence-based browser inspection, debugging, accessibility and performance checks, and end-to-end verification. Select only when a task involves a web page or browser-visible behavior.
---

# Chromium Browser Engineering

Use Chromium as an investigation and verification instrument. The browser runtime is supplied by Antigravity or its installed Chrome DevTools plugin; this skill does not install a second browser, add Playwright/Puppeteer dependencies, or assume an undocumented tool API.

## Choose the right browser path

1. For a live application or user-visible flow, use the available Antigravity browser/subagent or Chrome DevTools plugin. Confirm its actual tools and target URL first.
2. For deterministic automated tests, use the project's existing browser runner (Playwright, Puppeteer, WebDriver, or equivalent). Do not add a runner when the repository already has one.
3. If no browser capability is exposed, report that limitation and continue with source-level checks; never claim a browser run occurred.

## Investigation loop

1. Reconstruct the route, relevant state, API calls, permissions and expected result before interacting with the page.
2. Inspect the rendered page and console/network errors before changing anything. Use test accounts and non-production data.
3. Reproduce the user's path with semantic locators where available. Avoid brittle coordinates and arbitrary sleeps; wait for a visible state or specific response.
4. Check responsive layouts at 375, 768, 1024 and 1440 CSS pixels when layout changes. Exercise keyboard navigation and focus for interactive controls.
5. Capture concise evidence: browser engine/version, URL or local route, viewport, actions, observed result, console errors and artifacts. A screenshot proves appearance only; it does not prove persistence, authorization or server behavior.
6. After a fix, repeat the same path and a nearby regression path. Report what was tested and any remaining browser/device gaps.

## Chromium-specific checks

- Inspect console exceptions, failed requests, uncaught promise rejections and layout shifts.
- Use DevTools performance, accessibility and network panels when warranted. Do not collect cookies, tokens, request secrets or personal data into reports.
- Chromium behavior does not prove Safari/WebKit or Firefox behavior. State the engine used when cross-browser compatibility matters.
- Keep remote debugging bound to loopback and use a disposable browser profile for sensitive workflows.

## Safety and evidence

- Do not submit real payments, destructive actions, production approvals or real user data during verification without explicit authorization.
- Do not bypass authentication, CORS, permissions or application safeguards to make a test pass.
- Keep test data synthetic and artifacts limited to what reproduces the issue.
- Separate source observations, browser observations and assumptions in the handoff.
