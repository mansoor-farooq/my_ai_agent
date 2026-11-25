---
name: dotnet-authentication-authorization
description: Use when implementing identity, authentication, authorization policies, claims, roles, tokens or tenant access in .NET.
---

# .NET Authentication & Authorization

Separate authentication (who) from authorization (may do what). Prefer framework-supported schemes, explicit policies and resource-based checks. Validate issuer, audience, lifetime and signing rules for tokens. Enforce tenant/resource ownership in the data path as well as UI. Cover anonymous, authenticated-but-forbidden, cross-tenant and privileged cases. Never store plaintext secrets or trust client-supplied roles/tenant IDs.
