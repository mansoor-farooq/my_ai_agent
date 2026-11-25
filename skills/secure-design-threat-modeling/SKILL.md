---
name: secure-design-threat-modeling
description: Use when adding or changing APIs, authentication, authorization, tenant boundaries, file or URL handling, payments, secrets, model tools, external integrations, or data export and synchronization.
---

# Secure Design and Threat Modeling

Security is part of the feature contract. Identify realistic abuse paths and enforce controls at the server, storage or process boundary; a hidden UI control or agent instruction is not an authorization boundary.

## Threat-model pass

1. Map assets, trust boundaries, actors, entry points, sensitive data and external dependencies from the actual repository flow.
2. State security assumptions and the attacker's realistic capabilities. Consider spoofing, tampering, repudiation, information disclosure, denial of service and privilege escalation; add domain-specific threats.
3. Trace object-level authorization and tenant identity from authentication through every read/write. Deny by default; test cross-user and cross-tenant access, not just happy paths.
4. Review input/output boundaries: injection, SSRF, path traversal, unsafe deserialization, upload limits/type validation, HTML escaping, redirects, CORS/CSRF, rate/resource abuse and webhook authenticity as applicable.
5. Protect credentials and personal/customer data: least privilege, short-lived scoped tokens, secret manager/environment injection, redacted logs, retention limits and explicit consent for any export. Do not collect data covertly or bypass ignore/policy boundaries.
6. Map each material threat to prevention, detection, recovery and a negative test or observable check. Include dependency/supply-chain and deployment configuration risks when relevant.
7. Use the stack-specific security skill as well: `node-auth-security`, `python-security`, or the relevant .NET security skills. For web application verification, map applicable controls to OWASP ASVS; verify the current version at `https://asvs.owasp.org/`.
8. Report residual risk and blocked checks. Never label a design secure solely because a checklist was read.

## Required handoff

| Threat / entry point | Impact and affected boundary | Mitigation | Verification evidence | Residual risk |
|---|---|---|---|---|

Prefer concrete exploit paths and minimal layered mitigations. Do not expand permissions, add telemetry, or change repository/Git behavior as an incidental security fix.
