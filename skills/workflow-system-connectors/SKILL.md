---
name: workflow-system-connectors
description: Use when a product workflow must integrate with another API, SaaS product, cloud service, ERP, CRM, identity provider, or external data source.
---

# Workflow System Connectors

Treat an integration as a maintained contract, not a one-off HTTP call.

## Connector contract

1. Confirm ownership, supported API/version, authentication, scopes, rate limits, pagination, webhooks and data retention from first-party docs.
2. Define mapping, canonical IDs, source-of-truth field ownership, sync direction, conflict rule and deletion behavior.
3. Isolate provider code behind a small adapter with typed request/response and normalized errors.
4. Configure timeouts, idempotency, bounded retries, quota handling, cursor/checkpoint and reauthorization behavior.
5. Protect tenant separation and validate every callback/redirect/URL to prevent SSRF or credential forwarding.
6. Keep secrets in an approved secret manager and expose a connection status/reconnect state in the product UI.
7. Provide dry-run/sandbox checks, health status, last sync, next action and a safe operator replay path.

Do not claim a connector is supported until its actual endpoints, scopes and test account behavior are verified.
