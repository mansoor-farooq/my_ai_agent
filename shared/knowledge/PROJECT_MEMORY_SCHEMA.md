# Project Memory Schema

Every project knowledge branch should preserve useful, verifiable context without exporting secrets or hidden private reasoning.

## Core files

```text
PROJECT_PROFILE.md       identity, owner, product purpose and Git URL
PLAN.md                   approved scope, milestones and acceptance criteria
FLOW.md                   actual entry-to-output workflows
UNDERSTANDING.md          architecture, contracts, invariants and unknowns
DECISIONS.md              accepted/rejected options and rationale
EVIDENCE.md               commands, tests, screenshots and observed results
RESEARCH.md               claims, sources, dates and secondary checks
PROMPT_LEDGER.md          project-scoped user prompts when explicitly enabled
CONVERSATIONS.md          transcript index and concise decision summaries
ROUNDS/                   immutable planning, build, verification and final snapshots
```

## Decision record

```text
Question
Observed evidence
Options considered
Selected decision
Reason
Verification
Reversal condition
```

## Research record

```text
Claim ID
Question
Source URL
Source type
Access/publication date
Extracted fact
Confidence
Independent check
Contradictions
Decision impact
```

## Memory boundary

Store project facts, user-approved prompts, final outputs, decisions and evidence. Do not store raw hidden chain-of-thought, credentials, customer data, unrelated chats or unlicensed third-party content.

