# V5.0 Trust Boundary — Research and Implementation Record

**Date:** 2026-11-13  
**Repository:** `E:\Agents`  
**Scope:** V5.0 managed action trust boundary only. V5.1 containment, V5.2 benchmarks and V5.3 installer portability remain separate phases.

## Research conclusion

The important limit is the boundary between Antigravity's interactive permission UI and the local managed executor. Antigravity's published hook contract describes `allow`, `deny`, `ask` and `force_ask`, and permission documentation describes the user-facing Ask flow. The examined contracts do not define a signed approval receipt for an exact MCP argument payload, nor a universal fail-closed result for hook timeout, invalid output or process failure. MCP Elicitation is a client-mediated interaction; a form-mode `accept` response is not, on its own, a cryptographic human-identity assertion. Therefore:

**Research effort note:** Parallel deep-research was requested at high depth, but
the research service reported medium effort for its returned reports. The
implementation relies on the linked primary platform/protocol documents for
the host-boundary conclusions; this should not be presented as exhaustive
market research.

- Keep Antigravity review prompts as a host UX and policy layer.
- Enforce exact action, policy, expiry, replay and effect checks inside the managed executor.
- Label a local receipt as a local-runtime record, not as proof that a named human clicked a host dialog.
- Keep native editor/shell actions outside managed-effect evidence unless the host exposes an enforceable, auditable post-approval/effect interface.

Durable-execution references support the recovery design. Temporal documents at-least-once activity execution and the need for idempotency keys because a process may perform an effect and then fail before recording success. LangGraph similarly warns that resumed work can repeat nodes around side effects. The executor consequently records a durable `executing` state before file replacement, then reconciles the destination against the expected output hash and saved preimage after restart. If neither state matches, it stops as unknown rather than repeating an uncertain effect.

## Changes implemented

| V5.0 concern | Change |
|---|---|
| Stable action identity | Manifest write entries now include action-scoped idempotency keys independent of payload; the separately stored payload hash rejects a changed payload under the same key. |
| Durable approval | Local HMAC key and receipt metadata persist under the project's ignored `.agents/ultra-v4/managed-runs/<taskId>/` directory. A hash-chained JSONL ledger rejects malformed, truncated or tampered history. |
| Policy binding | Runtime re-computes the action manifest against the current project/worktree revision, full check registry and current rule-registry hash. A missing mandatory verification check is rejected during manifest creation. |
| Crash recovery | Run, approval and effect state transitions are flushed before a managed side effect. A replay of the same valid manifest/receipt can resume; changed payload, expired receipt, policy mismatch or unknown filesystem state blocks. |
| Effect proof | Managed writes record preimage and result hashes; successful check evidence advances effects to `verified`. |
| Patch promotion | The managed promotion wrapper records the `promoted` transition. Promotion retries detect the exact staged patch and do not apply it a second time. |
| Native boundary | Manager and architecture docs distinguish local managed MCP receipts from unverified native host activity. No OS sandbox or host identity attestation is claimed. |
| Packaging | The portable plugin source list includes `durable-ledger.mjs`; the release-content test checks for it. |

## Release verification — 2026-11-13

- `npm run build` passed and refreshed 507 owner source checksums.
- Antigravity strict plugin validation passed with 15 agents, 179 skills, 4
  rules, 1 PreToolUse hook and 1 local MCP server; zero provider connectors.
- Doctor passed 20/20 checks with zero warnings or failures.
- Focused release suite: 193 tests total, 187 passed, 0 failed, and 6
  PostgreSQL RAG integration tests skipped because the explicit database gate
  was not enabled. The six skipped tests are not counted as verified.
- Fresh direct rerun of the V5 action-manifest, durable-ledger, managed-MCP
  approval, managed-runtime and managed-MCP regression modules: 30 passed,
  0 failed. Node's parallel `--test` process hit sandbox `spawn EPERM`; the
  modules passed when invoked directly and sequentially.
- RAG skip explanation and follow-up: the six DB integration cases skip unless
  `RUN_RAG_TESTS=1`; the release invocation left it unset. Re-running
  `node tools/rag-ci-gate.mjs` against the dedicated local
  `mansoor_agent_rag_test` database passed all 8 tests (6 DB cases included),
  with 0 failures and 0 skips. No credential was saved to the repository.
- Runtime fault-injection covers interruption before the write and after the
  file effect but before ledger completion; the exact retry reconciles safely.
- `git diff --check` reported no whitespace errors (only Windows line-ending
  conversion notices).
- Owner-signed ZIP: `E:\Agents\dist\mansoor-agent-hub.zip`, SHA256
  `55F40872BAE592FB78A6668BD1442A54551B70727EE20E490513FACB1D3B92DD`.
  Archive listing confirms V5's durable ledger, managed runtime and MCP server.
- Fixed update discovery to check plugin inventory and default, legacy and
  configured global profile roots. The regression test passed.
- The final build detected the installed profiles and planned 573 file
  refreshes. The active Antigravity process held `plugins/mansoor-agent-hub`
  open, so installation stopped before profile synchronization. Active V5
  runtime update/reload is therefore unverified. Close Antigravity and rerun
  the bundled installer to finish.
- Extracted the signed 1.14.0 ZIP to
  `E:\Agents\dist\mansoor-agent-hub-1.14.0` and verified its version, installer
  launcher, signature owner and bundled durable ledger. The older
  `dist/mansoor-agent-hub` directory is still 1.13.0 and must not be used.
- GitHub-hosted CI and Git push were not observed.

Earlier focused counts were exploratory and are superseded by the release result
above. Host hook-health, cryptographic human identity, native editor/shell
effect reconciliation and OS containment remain outside the available host
contract; do not report them as verified.

## Remaining V5.0 acceptance gap

The managed executor has its own fail-closed authorization checks, but the current public Antigravity hook/MCP interface does not provide verifiable hook-health or signed human-approval evidence to the local MCP server. A denied MCP call never reaches the server, but a missing or failed hook cannot be proven absent from inside that server. Native editor and shell effects also cannot be post-attested by this ledger. The release must retain this limitation; do not label V5.0 as proving universal host fail-closed behavior. Close this only if a supported host-side approval/effect API becomes available or the managed lane is redesigned around an independent user-confirmation broker.

## Sources

- Google Antigravity hooks: <https://antigravity.google/docs/hooks.md>
- Google Antigravity permissions: <https://antigravity.google/docs/permissions>
- Google Antigravity MCP: <https://antigravity.google/docs/mcp>
- MCP Elicitation: <https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation.md>
- MCP Tools guidance: <https://modelcontextprotocol.io/docs/concepts/tools>
- Temporal error handling and at-least-once activities: <https://docs.temporal.io/develop/python/best-practices/error-handling>
- LangGraph durable execution: <https://docs.langchain.com/oss/python/langgraph/durable-execution>
- SQLite transactions / durability reference (reviewed; no database dependency was added): <https://sqlite.org/transactional.html>

## Runtime speed guidance

Use the manager's current Fast route for small reversible tasks: load the relevant project memory and affected symbols, invoke at most one specialist, select only its required skill(s), and run the narrowest meaningful check. Use Premium routing for architecture, security, migration, release, ML or explicit research. Do not load all skills or all specialists into every run. Repository maps and verified context reduce repeated discovery; check caching may skip only checks whose exact input hash and tool version are unchanged. Keep verification mandatory, and make no latency or accuracy percentage claims without paired task benchmarks.
