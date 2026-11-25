---
name: mansoor-artifact-provenance
description: Use when building, signing, promoting, publishing, or deploying packages, containers, binaries, models, or other release artifacts.
---

# Mansoor Artifact Provenance

Bind a release artifact to the source and checks that produced it.

1. Identify repository, source revision, dirty state, lockfiles, toolchain and build workflow.
2. Prefer reproducible builds from pinned inputs. Record the build run and exact artifact digest; never substitute a local rebuild without recording the new digest.
3. Inspect available signature, attestation, SBOM and vulnerability scan evidence. Distinguish absent evidence from a clean result.
4. Confirm the candidate artifact promoted to the next environment has the same digest as the tested artifact.
5. Keep credentials and private registry tokens out of logs and reports. Report only safe identifiers and redacted locations.

Use evidence labels from `mansoor-grounded-claims`. Do not infer artifact integrity from a filename, tag or successful build message alone.

## Stop condition

The promoted artifact has a traceable source revision and digest, its required checks are evidenced, and every missing provenance control is explicit.
