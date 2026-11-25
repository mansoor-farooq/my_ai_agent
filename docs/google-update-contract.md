# Google-aligned update contract

This project has two different host surfaces. They must not be updated by copying files over a running process.

## Native Antigravity plugin

The native plugin is updated through the genuine `agy` CLI:

1. Build and sign the package.
2. Stage it outside the active plugin directory.
3. Run `agy plugin validate --strict <stage>`.
4. Read `agy plugin list --json` and verify the installed name, version and absolute path.
5. If Antigravity is running and the version must change, stop before any profile or permission sync and journal `deferred-host-active`.
6. Run `agy plugin install <stage>` only after the host is closed normally.
7. Read `agy plugin list --json` again and verify the exact target version and path.

The installer preserves third-party plugins and never force-overwrites a locked plugin directory. A build result is not an installation result.

## Gemini CLI extensions

Google's Gemini CLI extension contract is separate from the native Antigravity plugin. An extension installed with `gemini extensions install` is updated with `gemini extensions update <name>` or `gemini extensions update --all`; `--auto-update` may be selected when installing a source-backed extension. The Mansoor Agent Hub is currently an `agy` plugin with a verified profile synchronizer, not a Gemini CLI extension, so the installer does not pretend that `gemini extensions update` updated the native plugin.

## Hook contract applied here

Google documents that hooks run synchronously, use JSON over standard input/output, and treat timeout values as milliseconds. The packaged hook therefore uses `${extensionPath}` for the command path and working directory, has a bounded 10-second timeout, writes only one JSON decision to stdout, returns exit code `0` for an intentional JSON deny, and reserves exit code `2` for malformed or failed hook execution. The hook remains a policy guard, not an operating-system sandbox.

Google also documents configuration precedence: system settings override user and project settings. The System Doctor reports a detected `GEMINI_CLI_SYSTEM_SETTINGS_PATH` or the platform system settings file without editing it, so permission or hook overrides are visible instead of being misdiagnosed as profile drift.

For Gemini CLI subagents, Google documents isolated context loops, explicit `tools` allowlists and `timeout_mins`. The profile converter now maps Antigravity tool names to the official Gemini names (`read_file`, `grep_search`, `run_shell_command`, `replace`, `google_web_search`, `web_fetch`), omits unavailable native-only tools, and sets a ten-minute bounded subagent timeout instead of inheriting every parent tool.

## Documentation-first governance

Every change to hooks, permissions, subagents, tools, background execution, context handling or host configuration must begin with the current official Google Gemini CLI documentation. The manager records the source URL and version in the research ledger, compares the documented contract with the host's observed behavior, and implements only the supported intersection. If documentation is unavailable or ambiguous, the change is marked unknown and the risky mutation stops. Documentation is a prevention and compatibility gate; it cannot guarantee zero host or provider failures.

## Parallel and background execution contract

Google's runtime guidance supports parallel subagents only for independent work and warns against concurrent mutation of the same resources. The planner therefore keeps three workers as the normal default, while an owner-authorized Turbo session can expose a maximum of twenty bounded slots. This is a ceiling, not a launch count: dependency cycles, overlapping writer paths, host/provider quotas and memory pressure lower the actual wave. Read-only research can fan out; one writer owns a path; no duplicate workers are invented.

Long-running shell services should use the host's background execution (`run_shell_command` with `&`) and retain the returned PID/session identifier. The manager polls that one session and emits milestone events instead of re-running the command or repeatedly saying “verifying”. Google’s shell configuration also supports output-efficiency optimization and explicit background completion behavior; these remain host-owned settings and are never silently overwritten by the Mansoor installer.

Sources: [Gemini CLI hooks](https://github.com/google-gemini/gemini-cli/blob/main/docs/hooks/index.md), [hooks reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/hooks/reference.md), [hook best practices](https://github.com/google-gemini/gemini-cli/blob/main/docs/hooks/best-practices.md), [subagents](https://github.com/google-gemini/gemini-cli/blob/main/docs/core/subagents.md), [parallel delegation guidance](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/prompts/snippets.ts), [background shell](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/shell.md), [extension reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md), and [configuration precedence](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md).
