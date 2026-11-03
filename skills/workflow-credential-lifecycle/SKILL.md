---
name: workflow-credential-lifecycle
description: Use when an automation stores or uses API keys, OAuth grants, service accounts, certificates, webhook secrets, or provider credentials.
---

# Workflow Credential Lifecycle

Keep credentials separate from workflow definitions, user-visible run data and exported project memory.

## Requirements

1. Choose the platform secret store and least-privilege credential type; scope credentials to a tenant, integration and operation.
2. Store a secret reference in configuration, never the secret value. Redact request headers, URLs, error messages and traces.
3. Define initial authorization, expiry detection, rotation, revocation, reconnect and owner transfer.
4. Ensure queued jobs resolve the current credential safely without copying its value into payloads or logs.
5. Handle secret-store outage as a safe blocked execution, not a retry storm.
6. Add automated scans/fixtures proving logs, artifacts, errors and exports do not contain credentials.

Never copy provider keys from one developer's machine into a portable agent bundle or another user's project.
