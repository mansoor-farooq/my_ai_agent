---
name: mansoor-oss-repository-archaeology
description: Use when examining open-source repositories for reusable architecture, workflows, data models, implementation patterns, or product behavior.
---

# Mansoor OSS Repository Archaeology

Trace how a repository actually implements a behavior before recommending reuse.

1. Pin canonical repository URL, commit/release, maintenance status, supported runtime and license. Verify these from the repository and authoritative license file.
2. Find entry points and trace one representative flow end to end: route/command, service, persistence, events/jobs, permissions, errors and tests.
3. Cite concrete source paths and symbols; distinguish implementation evidence from README claims and screenshots.
4. Check extension points, migrations, dependencies, security posture, test coverage and compatibility with the target project.
5. Return a reuse/adapt/inspire/custom decision with benefits, incompatibilities, attribution obligations and a bounded proof-of-concept path.
6. Stars or popularity may help discovery but never override license, maintenance, security or technical fit.

## Stop condition

Every recommendation has a pinned source revision, license and traced code evidence, or the candidate is rejected as unverified/incompatible.
