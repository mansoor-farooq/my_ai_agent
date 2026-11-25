# Agent Control Plane

The control plane is the least-privilege contract between the local sidecar agent and the private knowledge repository.

## Recommended external transport

Use a GitHub App installed only on the selected private knowledge repository. GitHub's official model supports fine-grained repository permissions and short-lived installation tokens. The app should request only repository metadata read, contents write for the knowledge branch, and optional pull-request/actions read for evidence.

Do not request administration permission. Do not put the app private key in this repository. Store it in the local credential manager or a dedicated server-side secret store.

The checked-in manifest is a local policy contract, not a GitHub App registration. App ID, installation ID, private key and webhook secret remain external to Git.

## Branch controls

Configure a GitHub ruleset so `main` is protected, force-push is blocked, and knowledge branches follow `knowledge/**`. Require status checks or review before merging anything into `main`; the sidecar writes only to its knowledge branch.

## Audit controls

Record metadata-only events: install, policy denied, sync start, sync result and revoke. If a webhook is added later, validate GitHub's `X-Hub-Signature-256` before processing the payload.

Validate the checked-in policy with:

```powershell
node tools/validate-capability-manifest.mjs
```
