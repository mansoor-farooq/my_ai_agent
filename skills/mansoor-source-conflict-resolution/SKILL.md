---
name: mansoor-source-conflict-resolution
description: Use when repository code, official documentation, external references, or prior reports disagree about a technical or product behavior.
---

# Mansoor Source Conflict Resolution

Resolve source conflicts by comparing scope, version and directness rather than averaging incompatible claims.

1. Record each conflicting claim with its exact repository path/line or opened canonical URL, version/revision and date.
2. Prefer current direct implementation evidence for what this repository does; prefer current official docs for supported external API/platform behavior. These answer different questions, so do not treat them as interchangeable.
3. Check whether the mismatch is explained by versions, configuration, feature flags, environment, permissions or stale documentation.
4. Seek one additional primary source or a bounded reproducible observation when the conflict changes the recommendation.
5. If unresolved, report both claims, impact and what evidence would resolve them. Do not silently select the answer that best fits the requested conclusion.

## Stop condition

The conflict is resolved with traceable evidence or remains explicitly unresolved with a safe recommendation.
