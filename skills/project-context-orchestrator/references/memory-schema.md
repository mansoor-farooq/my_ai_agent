# Project Memory Schema

Store compact Markdown files under `.agents/memory/` only when persistent
project context is useful. Keep each entry evidence-linked and revision-aware.

## `project-map.md`

```markdown
# Project Map

- revision: `<branch> @ <commit-or-fallback-fingerprint>`
- generated_at: `<ISO-8601>`
- inspected_scope: `<modules/files>`
- stack: `<framework/language/platform>`
- entry_points: `<paths and symbols>`
- flow_index: `<input -> state/service -> data source -> output>`
- module_boundaries: `<short bullets with file references>`
- contracts: `<API/schema/persistence facts; redact values>`
- test_commands: `<commands and last observed result>`
- conventions: `<patterns verified in source>`
```

## `decisions.md`

Record only decisions that future work must preserve:

```markdown
## DEC-<number>: <short title>
- status: proposed | accepted | superseded
- date: `<ISO-8601>`
- decision: `<one sentence>`
- drivers: `<constraints and user outcome>`
- alternatives: `<rejected options and why>`
- evidence: `<file/symbol/test references>`
```

## `change-log.md`

Keep one compact entry per meaningful change:

```markdown
## <ISO-8601> — <revision>
- scope: `<files/modules>`
- changed: `<behavior>`
- verification: `<observed commands/results>`
- follow_up: `<unknowns or next check>`
```

## `open-questions.md`

For each unresolved point, record the decision impact and cheapest observation:

```markdown
## Q-<number>: <question>
- impact: `<what could change>`
- current_evidence: `<observed facts>`
- assumption: `<if one is needed>`
- next_observation: `<question, test, or file to inspect>`
```

Never put secrets, tokens, cookies, private identifiers, or raw customer data
in these files.
