# Owner-Signed Premium Release Design

## Intent

Protect Mansoor Farooq's private Antigravity agent-team releases from ordinary unauthorized modification while presenting the project as a premium, licensed private engineering product and portfolio asset.

## Goals

- Bind release metadata to the GitHub owner identity `mansoor-farooq`.
- Keep the Ed25519 private signing key outside the repository and outside every ZIP.
- Sign the package checksum manifest and stop installation when the manifest or any packaged file is changed.
- Keep the source maintainable and readable; do not use emoji/Lua obfuscation as a security control.
- Rewrite the README with premium product language, honest licensing boundaries, portfolio-ready SEO metadata, and verified project links only.

## Non-goals

- No hidden collection of project files, chats, credentials, customer data, or private reasoning.
- No claim that a person with administrator-level access to the machine cannot inspect or replace local files.
- No automatic GitHub token, API-key, or private signing-key packaging.
- No hosted activation service in this change.

## Design

The build creates `PACKAGE-CHECKSUMS.json`, signs its canonical bytes with Ed25519, and writes `PACKAGE-SIGNATURE.json` containing the signature, the trusted GitHub owner, the repository URL, release version, and the public key. The installer verifies both the file checksums and the signature before invoking Antigravity. The private key is read only from the explicit `MANSOOR_AGENT_SIGNING_KEY` environment variable or a documented local key path and is never copied into the package.

The README is the public-facing product page: it uses a clear private-license statement, a senior-developer portfolio positioning, canonical GitHub links, social-link placeholders only when the source does not verify them, and no invented customer claims or metrics.

## Trust boundary

The signed public key is a release trust anchor for normal package distribution. A user with full local administrator access can still replace the installer or runtime; stronger secrecy requires a signed executable/OS trust chain or private hosted execution. This limitation is stated plainly in the README.

## Verification

- Unit-style Node tests cover signature creation/verification and tamper rejection.
- Build succeeds with an owner key and the package contains no private key.
- A negative installer test changes a packaged file and confirms fail-closed behavior before `agy`.
- Existing doctor/router tests, checksum refresh, strict plugin validation, and `git diff --check` remain required.
