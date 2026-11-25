---
name: mansoor-security-boundary
description: Use when work touches authentication, authorization, secrets, tenants, file paths, shell commands, network calls, uploads, or destructive actions.
---
# Mansoor Security Boundary
Map trust boundaries and capabilities before implementation. Validate identity, scope, path containment, input limits, secret handling, auditability and negative paths. Fail closed on missing authority or malformed manifests. Keep security findings concrete and reproducible; do not widen permissions to make a test pass.

Stop condition: the changed boundary has a verified allow path and rejected unsafe paths.

