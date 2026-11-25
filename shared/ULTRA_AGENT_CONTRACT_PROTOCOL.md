# Ultra Agent Contract Protocol

The project contract is intentionally small and visible at the selected project root:

```text
plan/ flow/ status/ logic/ requirements/ test-cases/
```

`node <hubRoot>/tools/ultra-agent-v2/contract.mjs audit --dir <project>` is read-only. It reports missing folders and returns a bootstrap proposal. `bootstrap --approved --approval-id <id>` is the only contract-folder bootstrap path.

Accepted requirements and architecture decisions are append-only. A changed decision creates a superseding version; it never overwrites the accepted artifact. `createRequirement` writes machine-readable front matter with project identity, version, owner, approval ID, supersession reference and content hash.

Before implementation, the manager creates a typed delegation envelope containing the project/contract/task identity, read and write allowlists, forbidden paths, allowed commands, required evidence and approval ID. `tools/ultra-agent-v3/policy.mjs` validates concrete writes through the contract kernel. Protected paths include environment files, Git metadata, private keys and accepted requirements.

Completion requires independent verification of the approved file inventory, requirement/test coverage, evidence records and applicable checks. Retrieved memory and RAG context are evidence, not authorization.
