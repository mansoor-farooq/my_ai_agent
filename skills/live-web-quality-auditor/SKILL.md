---
name: live-web-quality-auditor
description: Use when a running web application needs end-to-end browser validation, live smoke testing, UI/responsive review, API failure diagnosis, or a reproducible QA report.
---

# Live Web Quality Auditor

Run a bounded, evidence-first audit of an authorized web application. The
default output is a defect report and regression checklist. For development
and staging environments, an explicit transactional manifest can authorize a
reversible end-to-end order run; the manifest never grants permission to
change source code or use real payment.

## Modes

- **audit (default):** read-only smoke and UI/API investigation; stop before
  order submission.
- **transactional:** execute only the actions, test users, branches, products,
  quantities, and maximum order count listed in
  `references/transactional-manifest.md`. Require a disposable fixture or a
  documented cleanup API. If the manifest is missing or ambiguous, stay in
  audit mode.

## Provider selection

Choose the first provider that is available in the current environment:

1. Antigravity App/CLI: delegate browser actions to the built-in `/browser`
   subagent. It can use real Chrome, screenshots, recordings, console,
   network, Lighthouse, performance traces, and device/network emulation.
2. Playwright MCP or the existing `webapp-testing` skill: use a deterministic
   Playwright runner and save artifacts under `testing-reports/<timestamp>/`.
3. Codex computer-use/CUA: use the visible browser session, collect the same
   evidence, and state which checks were unavailable.

Do not pretend that browser access exists when no browser provider is exposed.
Report the capability gap and stop at the preflight result.

## Preflight contract

Before opening the site, record:

- authorized base URL and environment (staging, preview, or production)
- test account role; credentials must come from an environment/secret store
- allowed mutation scope and a maximum run count (default: one smoke run)
- routes or user flows to cover
- viewport set (default: 360x800, 412x915, 1280x800)

For live environments also define a request budget per route, backoff policy,
and cleanup/rollback plan. Do not brute-force retries, inject malformed
payloads, probe unapproved endpoints, or create addresses, orders, messages,
reservations, or analytics noise without an isolated disposable fixture.

Reject real payment, destructive admin, or bulk-data actions unless the user
explicitly authorizes a reversible test fixture. Never print tokens, cookies,
passwords, or full authorization headers in artifacts.

## Audit loop

1. Navigate to the base URL and wait for a user-visible readiness signal.
2. Capture an initial screenshot, accessibility snapshot, console messages,
   and network failures.
3. Execute the smallest meaningful flow matrix: login/logout, home, search,
   product detail, cart, customer selection/order-booker path, reorder, and
   checkout preview. Include quantity bounds, stock/price/tax/shipping
   recalculation, refresh/back behavior, double-submit, timeout retry, and
   concurrent-tab checks when the environment provides a disposable fixture.
   Skip unavailable flows and record the reason.
4. After every meaningful action, wait for the page-specific readiness signal
   or a bounded timeout, then inspect the URL/DOM change, console, and network
   responses. A click with no observable state change is a finding only after
   classifying intentional no-op, debounced, delayed, blocked, and failed
   outcomes.
5. Repeat the smoke flow only up to the configured run count. Use a fresh
   context when checking session persistence or logout behavior.
6. Repeat critical screens at each viewport and, when requested, slow 3G,
   offline, reduced motion, RTL, keyboard-only navigation, browser zoom,
   orientation, or large text scale.
7. Stop before any real order/payment submission. Produce the report even when
   a preflight or login failure prevents the rest of the matrix.

In **transactional** mode, replace step 7 with: create or select only the
manifest's disposable users, execute the allowed order lifecycle, assert the
expected totals/statuses/stock changes, record every created identifier, and
run cleanup. A COD test means a development-only order with a fake or
server-side test payment state; never enter real banking, card, or courier
settlement data.

## Scaling across branches and catalog data

For a large catalog, do not click every combination blindly. Load branches,
companies, products, variants, and users from the manifest's fixture file and
generate a deterministic coverage matrix:

- smoke one representative branch per company and one product per category;
- boundary cases for zero/one/many products, stock limits, discounts, and
  quantities;
- role cases for normal customer and order booker;
- a full shard only when the manifest explicitly requests it.

Use stable `qa_run_id` and idempotency keys. Shard work by branch or company,
keep a request/order budget per shard, and merge duplicate findings by root
cause. Report coverage as `branches tested / branches requested`,
`products tested / products requested`, and `flows passed / flows attempted`.

## Required checks

**Functional:** visible routes, navigation/back behavior, forms, loading,
empty, retry, success, and error states.

**Auth/session:** valid and invalid login, lockout/rate-limit behavior, cookie
flags when observable, expired session, logout, back-button access, role
visibility, redirects, and unauthorized direct URLs. Do not bypass
authentication.

**Network/API:** status codes, latency, timeout, failed/malformed responses,
retry behavior, pagination, and response-to-UI consistency. Classify possible
IP or rate limiting from evidence such as repeated 403/429 responses, DNS or
TLS errors, connection resets, and a failing health endpoint. Use “possible”
unless the same request is confirmed from an allowed comparison origin.
Never submit fault-injection payloads or test IPv4/IPv6, proxy, VPN, region,
currency, tax, or shipping differences unless that comparison is explicitly
authorized and has a safe fixture.

**UI/responsive:** horizontal/vertical overflow, clipped modals, overlapping
text, broken images, inconsistent card heights, intermediate widths, touch
targets below 44px, contrast, focus order, accessible names, and text scale up
to 1.3x.

**Performance:** page readiness, slow requests, long tasks, layout shift,
large images, and obvious memory growth during a bounded repeat. Use Lighthouse
or a performance trace when the provider supports it.

## Evidence and report

For every finding save the smallest useful evidence: timestamp, URL/route,
viewport, user action, expected/actual result, screenshot or recording,
console excerpt, relevant request/response status, and a stable repro sequence.
Redact secrets and personal data in screenshots, DOM/accessibility snapshots,
URLs/query strings, logs, request/response bodies, and recordings. Never store
full auth headers, cookies, passwords, customer addresses, or order payloads.
Use the report fields in
`references/report-schema.md`.

For transactional runs also read `references/transactional-manifest.md`; it
defines the allowlist, fixture format, cleanup contract, and coverage output.

Assign severity:

- **P0:** security exposure, data loss, or an unsafe real-world mutation
- **P1:** login, checkout, or a core flow is blocked for a supported role
- **P2:** incorrect behavior, broken responsive state, or repeated API failure
- **P3:** cosmetic, accessibility, performance, or intermittent low-impact issue

Deduplicate the same root cause across viewports. Separate observed facts from
inference, include confidence, and give one practical remediation suggestion.

## Re-run policy

After a fix, rerun the exact failed scenario plus one adjacent smoke scenario.
Reset or isolate state between repeats so carts, orders, emails, analytics
events, and rate limits are not duplicated. Exercise refresh, retry,
double-click, and interrupted-submit behavior when the flow mutates state.
Clean up test data where the system allows it. Do not silently change
selectors, relax assertions, disable security checks, or retry forever to make
a result green. If the environment is unavailable, return the evidence and a
blocked status instead of guessing.

## Final response shape

Return:

1. environment and provider
2. flows attempted and skipped
3. pass/fail/blocked counts
4. findings ordered by severity with evidence links
5. likely causes and recommended fixes
6. coverage gaps and the exact next regression run

### Example invocation

`/browser Audit the authorized Cartivo staging URL at 360x800 and 412x915. Run
login, home, product detail, customer selection, cart, and checkout-preview.
Do not submit a real order. Capture screenshots, console errors, failed
requests, overflow, and a severity-ranked report.`

