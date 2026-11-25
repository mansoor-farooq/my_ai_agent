# Full Portable Agent Product Design

## Intent

The recipient ZIP must reproduce the Mansoor Agent Hub's manager, specialist, skill and rule behavior without depending on the owner's Antigravity profile. The current agents-only package does not meet that goal because it removes agent skill metadata and ships no skill or rule bodies.

## Selected approach

Build a self-contained Antigravity plugin from the owned `E:\Agents` source. Bundle every approved local skill, the four agent-referenced Flutter/Android skills and the twelve remaining unique Antigravity global skills, preserve each agent's `skills:` metadata, and ship the four applicable global rules as product-owned source files.

## Constraints

- Keep `production-orchestrator` as the only main agent and retain the 14 specialists.
- Bundle 171 skill bodies and 4 rules; every agent skill reference must resolve locally.
- Preserve reusable skill-local references, templates, starter assets and agent metadata from the owner-managed non-Antigravity skill sources.
- Keep MCP servers, hooks, sidecars, provider bridges, credentials, private chats and native profile data out of the ZIP.
- Preserve third-party licence and provenance notices.
- Sign and checksum every packaged file and fail closed on tampering.
- Antigravity strict validation, doctor checks and focused tests must pass before release.

## Alternatives considered

1. Agents only: smallest package, but behavior changes on a clean PC.
2. Directly referenced skills only: smaller, but omits dynamically routed skills.
3. Complete owned bundle: selected because it is the only approach that satisfies repeatable product delivery.
