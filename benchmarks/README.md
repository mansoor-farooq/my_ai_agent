# Agent benchmark protocol

This directory intentionally contains no fabricated task results. A benchmark case becomes score-eligible only after an owner reviews its expected acceptance and records the pinned repository revision, profile version, model/config hash, and reviewer.

## Minimum evaluation design

- Create 10–20 representative, non-overlapping tasks per specialist, using sanitized owner-approved project snapshots.
- Hold out cases from prompt or skill tuning; never tune against the entire evaluation set.
- Run each case three times with the same pinned model, profile, tools, repository image, and acceptance checks.
- Compare team-assisted runs with a paired Gemini-only baseline under the same limits.
- Report acceptance/accuracy, first-pass success, repair success, regression count, unsafe-action rate, p95 latency, missing coverage, and cost only when measured from a complete source.
- Keep raw prompts, credentials, customer data, private chats, and hidden reasoning out of the corpus.

The result schema is `tools/benchmark-schema.json`; the current evaluator is `tools/agent-benchmark.mjs`. The evaluator rejects unreviewed or unpinned records and reports fewer than ten unique cases per agent as insufficient coverage. A passing evaluator test does not mean the model has been benchmarked.

## Reproduce a report

```powershell
node tools/agent-benchmark.mjs .\benchmarks\approved-observations.json
```

The observations file is owner-maintained and should remain private if its task snapshots or labels are private.
