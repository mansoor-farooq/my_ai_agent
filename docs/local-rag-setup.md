# Local project RAG setup

The Mansoor Agent Hub RAG runtime uses PostgreSQL only when a loopback server is reachable. It will not connect to a remote database automatically. Credentials are read from the current project `.env.local`, `.env`, `example.env`, or `.env.example` (in that precedence order; process environment wins).

Supported settings are `RAG_DB_HOST`, `RAG_DB_PORT`, `RAG_DB_NAME`, `RAG_DB_USER`, `RAG_DB_PASSWORD`, `RAG_PSQL_PATH`, and local-only `RAG_DATABASE_URL`. Standard `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD` are also accepted. Keep real values in an untracked `.env.local` or `.env`; do not commit passwords.

```dotenv
RAG_DB_HOST=localhost
RAG_DB_PORT=5432
RAG_DB_NAME=mansoor_agent_rag
RAG_DB_USER=dev
RAG_DB_PASSWORD=replace-with-your-local-password
```

Run `npm run rag:doctor` to perform one non-mutating connection check. It uses `psql -w` and exits instead of waiting for a password prompt. If ready, run `npm run rag:setup -- --dir <project-path> --project <project-name>` to create/update the project-scoped index once. Database/schema creation requires sufficient permissions. On connection or permission failure, fix the local env values or service and rerun; the tool reports a short status without printing credentials or raw database errors.

The Antigravity manager uses a single doctor attempt per task. If local PostgreSQL is not available, it records that RAG is inactive for the task and continues from cached project memory, the repository map, and task-scoped source reads without repeated DB retries.
