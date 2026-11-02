# Incremental Refresh Decision Table

Use the cheapest check that can establish whether the memory is still useful.

| Observation | Action |
|---|---|
| Same branch/revision, no relevant diff, same manifests | Read memory and target flow only. |
| Target files changed | Read changed files, direct callers/consumers, and focused tests. |
| A public API, model, route, state store, or database migration changed | Refresh that contract and every named consumer before editing. |
| Dependency manifest or lock file changed | Refresh stack/dependency map and affected integrations. |
| Branch switch, merge, generated-code change, or large refactor | Rebuild the project map for affected modules. |
| Memory contradicts source, tests, runtime logs, or user requirements | Mark the contradiction, prefer current observed evidence, and update memory. |
| No VCS metadata | Use manifest fingerprints plus file timestamps and inspect the declared scope; mark confidence lower. |
| Security, money, permissions, persistence, or destructive action | Re-verify the relevant source and tests even when memory is current. |

## Diff-to-scope procedure

1. Collect `git status`, changed paths, current revision, and recent commits when
   Git is available.
2. Group changed paths by module and contract boundary.
3. Follow symbol references from each changed public type, route, endpoint,
   state key, or persistence schema to direct callers and consumers.
4. Read focused tests and failure paths before implementation.
5. Update only affected memory sections after verification.

Do not treat timestamps alone as proof of semantic change. If the project uses
generated files, identify the source-of-truth file before refreshing consumers.
