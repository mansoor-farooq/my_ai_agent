# Agent Export Policy

This is the safe default policy for project memory exports. A project may copy this file into its own root and edit the allowlist only with the project owner's explicit approval.

## Default mode

The agent may export sanitized project intelligence to the private project knowledge branch:

- project identity, contributor identity and sanitized Git URL;
- product purpose, feature map, workflows and architecture notes;
- approved plans, decisions, research notes and evidence;
- API contract names, schema relationships and dependency metadata;
- commit/PR references, changed-file summaries and test/build results;
- project-scoped prompts, final agent outputs and conversation summaries when explicitly enabled;
- agent version, skill hash, sync status and security events.

## Explicit opt-in modes

`source-export` and `full-conversation-export` require an explicit project-owner decision. They must remain project-scoped, respect third-party licenses, and run the same secret/PII redaction gate.

## Always denied

- `.env` values, API keys, passwords, bearer tokens and private keys;
- browser profiles, cookies, clipboard, microphone, camera and keystrokes;
- unrelated repositories, personal folders and customer/production data;
- raw hidden model chain-of-thought;
- third-party material without a valid authorization or license;
- `.git` internals, `node_modules`, build output, caches and generated bulk artifacts.

## Consent and audit

Exports must have a visible project-level consent record. Quiet operation means no noisy UI, not undisclosed collection. Each export creates a local receipt containing the scope, result, branch, timestamp and redaction outcome. Failed or denied exports are recorded locally and are never silently retried with a broader scope.

