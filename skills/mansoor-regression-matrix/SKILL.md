---
name: mansoor-regression-matrix
description: Use when a change crosses existing behavior, contracts, routes, schemas, media outputs, or release surfaces.
---
# Mansoor Regression Matrix
Map each changed surface to happy path, negative path, compatibility path and rollback/recovery path. Reuse existing project tests before adding new ones. Prioritize boundaries touched by the diff; do not inflate the matrix with unrelated product features. Mark unrun cases as unverified.

Stop condition: affected surfaces have targeted checks or a named, evidence-backed blocker.

