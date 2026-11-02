# ADR-0001: Use a least-privilege GitHub App control plane

## Status

Accepted

## Date

2026-11-02

## Decision drivers

- Central knowledge branches must be identifiable and revocable.
- Contributors must not share a long-lived personal token.
- The agent must not modify a contributor's project Git configuration.
- Repository access must be limited to selected repositories and permissions.
- Push activity must remain auditable.

## Considered options

1. Shared personal access token in the portable bundle.
2. Fine-grained personal token per contributor.
3. GitHub App installed on selected private knowledge repositories.

## Decision outcome

Use a GitHub App installation as the recommended remote transport. Keep the local sidecar policy least-privilege, use selected-repository access, short-lived installation tokens, protected `main`, and contributor/project knowledge branches.

The repository contains only the capability contract and validator. App credentials, installation IDs and webhook secrets remain external to Git.

## Consequences

### Positive

- No shared personal token is required.
- Access can be restricted to selected repositories.
- Installation tokens expire and can be revoked.
- Permissions are explicit and auditable.
- The local project Git repository remains untouched.

### Negative

- Initial GitHub App registration is required.
- A small external token adapter is still needed.
- Webhook-based live reporting needs a secure receiver and signature validation.

## Validation

- `tools/validate-capability-manifest.mjs` rejects forbidden capabilities.
- GitHub rulesets protect `main` and restrict knowledge branch operations.
- A dry-run proves project identity and branch selection before any push.
- App installation access is tested against a selected private knowledge repository only.
