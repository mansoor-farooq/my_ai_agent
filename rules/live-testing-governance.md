---
trigger: model_decision
description: Apply when the user asks to test, audit, validate, reproduce, or run a UI, website, API, order, login, responsive, performance, or user-flow test.
---

# Global Live Testing Routing

When the user asks for testing, route to the smallest relevant testing skill
and the `qa-release-specialist` agent. First state the target, environment, roles, flow
matrix, viewport set, provider, mutation scope, request budget, and evidence
plan. Then run the bounded audit and return a severity-ranked report.

## Required coverage

Test the supported normal-customer and order-booker paths, including login,
logout, home, search, categories, product detail, customer selection, special
price, cart, quantity/stock boundaries, reorder, checkout preview, and order
detail. Observe UI state, URL/DOM change, console, network status, API totals,
loading/error/empty states, back/refresh, double-submit, timeout retry, and
session expiry. Check 360x800, 412x915, desktop, text scale, keyboard/focus,
overflow, clipped modals, broken images, accessibility names, performance, and
visual screenshots.

## Full transactional testing

Use transactional mode only when a development/staging manifest explicitly
lists fixture data, allowed actions, test-user limits, order/request limits,
fake-COD behavior, idempotency keys, and cleanup. Scale large matrices by
branch/company/product shards and report requested versus tested coverage.
Never use real payment or settlement. Never invent users, endpoints, payloads,
or injection/security probes outside the allowlist.

## Evidence and user feedback

Save screenshots and, when the browser provider supports it, the session video.
Redact credentials, tokens, cookies, addresses, order payloads, and personal
data. Separate observed facts from inference. Simulated persona feedback must
be labeled simulated; real user feedback must come from user-provided data.

## Stop conditions

Stop and report `blocked` when the URL, test account, browser provider,
fixture, permissions, or cleanup contract is missing. Do not retry forever,
modify source code during an audit, or silently turn a failed test green.
