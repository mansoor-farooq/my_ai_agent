---
name: audit-network-api
description: Use when correlating browser requests, API status/latency, retries, caching, pagination, failures, and UI/network consistency.
---
# Network and API audit
Capture method, URL path without secrets, status, timing, cache signals and UI consequence. Test only normal read flows and bounded retry behavior. Never log tokens, cookies, full bodies or personal data; never inject malformed payloads without explicit safe fixtures.

Stop condition: network failures and latency outliers are tied to visible behavior or marked as unverified.
