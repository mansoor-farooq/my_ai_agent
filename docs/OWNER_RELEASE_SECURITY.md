# Owner Release Security

## Owner boundary

This agent hub is owned and maintained by Mansoor Farooq. The canonical source repository is:

- https://github.com/mansoor-farooq/my_ai_agent

The package name, release metadata and signed manifest use this owner/repository pair. A future public release needs a separate licence decision.

## Signing key custody

The release key is an Ed25519 private PEM stored outside the repository at the local owner profile:

`%USERPROFILE%\.mansoor-agent-keys\release-ed25519-private.pem`

The build reads `MANSOOR_AGENT_SIGNING_KEY` when set, otherwise it uses that default path. The private key must never be committed, copied into `dist`, placed in `.env`, or sent to another device through chat or an unencrypted file transfer.

Create the key once:

```powershell
node tools/create-owner-signing-key.mjs
```

Back up the private key in an encrypted password manager or offline encrypted storage. Rotate it deliberately with `--force`, then publish the new public trust anchor with a release note.

## Release verification

The build creates:

- `PACKAGE-CHECKSUMS.json` for packaged-file hashes;
- `PACKAGE-SIGNATURE.json` for the Ed25519 signature and release metadata;
- `verify-package-signature.mjs` with the release public trust anchor.

The installer verifies the checksum records and signature before it calls `agy plugin validate` or `agy plugin install`. A changed or missing package file stops installation.

## GitHub controls

For the private repository, Mansoor Farooq should enable GitHub branch protection for `main`, `development`, `c-development` and `mansoor-development` with:

1. Require a pull request before merging.
2. Require the relevant status checks.
3. Restrict who can push directly to protected branches.
4. Require signed commits when the GitHub plan and repository settings support it.
5. Keep repository visibility private until a licence, secrets review and public-release checklist are complete.

These are GitHub account controls. The local package cannot prove that a remote account is the human owner; it can only bind release metadata to the configured owner/repository and verify the package signature.

## Limits

Signature verification detects ordinary tampering and fails closed. It cannot make local software unreadable or stop a machine administrator from copying, replacing or reverse-engineering local files. Emoji/Lua obfuscation is not a security boundary. Keep proprietary logic on a private service if it must never ship to another machine.
