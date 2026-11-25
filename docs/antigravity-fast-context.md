# Antigravity fast local context

Antigravity uses `tools/antigravity-local-context.mjs` as its routine retrieval path. It is project-scoped and reads only a bounded set of files selected by the task query.

The first read has a 45-second default budget (configurable up to two minutes), records `durationMs`, `budgetMs`, `contentReads`, `timedOut` and `stopReason`, and stops instead of entering a repeated verification loop. An unchanged project revision and query return the cached packet immediately with `cacheHit: true`. This is a latency guard, not a promise that every repository can be fully understood in one minute; the manager must report the observed duration and any budget stop.

```powershell
node tools/antigravity-local-context.mjs prepare `
  --dir D:\Work\YourProject `
  --project your-project `
  --query "checkout API validation"
```

The first run uses the native Git file list and targeted `git grep`. The result is cached at `<project>/.agents/memory/antigravity-local-context.json`. Repeating the same task on the same revision returns the cached packet without rereading source files. Secrets, environment files, dependencies, generated output and binary archives are excluded; returned evidence contains paths, source hashes and line-bounded snippets.

PostgreSQL is optional. `rag:doctor` and the PostgreSQL integration tests remain available for owners who explicitly need the database index. They are not required for the Antigravity fast path, and the normal package build intentionally does not opt into database-mutating integration tests.
