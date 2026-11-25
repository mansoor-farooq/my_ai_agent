# Antigravity System Doctor

`tools/antigravity-system-doctor.mjs` is the read-only first check for a machine where the Antigravity package, Gemini CLI, Windows/WSL adapter, or optional local RAG is not behaving consistently.

```powershell
node <hubRoot>/tools/antigravity-system-doctor.mjs --json
```

It verifies executable paths and versions for `agy`, Gemini CLI, Node.js, npm, Git and (when present) WSL/PostgreSQL tooling. It validates the native `agy plugin list --json` shape, reports the Mansoor Agent Hub version/path, detects an active Antigravity process that would defer a plugin overwrite, and flags environment conditions that can make Gemini CLI non-interactive. It never prints credential values, changes provider/model selection, edits host permissions, or kills Antigravity processes.

## Recovery contract

The doctor emits one of three states:

- `ready`: required native checks are available.
- `attention`: the host can continue, but a warning needs review (for example an active Antigravity process, CI variables, or an explicit Google Cloud project).
- `blocked`: the native inventory could not be verified or a required runtime is missing. Resolve the one reported blocker, then run the doctor once again.

If an update is deferred because Antigravity is open, close it normally and rerun the signed package. The installer preserves the active plugin and third-party plugins; it does not force-overwrite locked host files. A package build can still be produced with `npm run build:package`, but that is intentionally package-only and does not sync the live host.

The doctor is deliberately separate from RAG. PostgreSQL/RAG remains optional: use `npm run rag:doctor` or `npm run rag:setup` only when a project needs durable retrieval. The Antigravity-native local context path works without a database and uses a bounded, revision-keyed cache.
