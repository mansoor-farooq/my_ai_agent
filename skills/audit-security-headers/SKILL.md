---
name: audit-security-headers
description: Use when auditing security headers, TLS/redirect posture, cookie flags, mixed content, exposed secrets, or safe web hardening signals.
---
# Security posture audit
Inspect only authorized public response headers, TLS/redirect evidence, cookie attributes when safely observable, mixed content and accidental secret exposure. Do not exploit, fuzz, bypass authentication or run destructive security probes. Classify suspected issues as observations, not confirmed vulnerabilities, unless evidence proves them.

Stop condition: the authorized passive security checks are complete or explicitly blocked.
