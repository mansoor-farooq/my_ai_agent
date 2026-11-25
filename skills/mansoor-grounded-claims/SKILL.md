---
name: mansoor-grounded-claims
description: Use when reporting consequential facts, current technical behavior, research findings, test results, deployment status, or any claim that could be mistaken for verified evidence.
---

# Mansoor Grounded Claims

Classify each consequential claim by what actually supports it. Do not let a plausible explanation become an observed fact.

## Evidence classes

- **Observed** — directly seen in the current repository, browser, device, command output, or artifact. Cite `path:line`, command/run ID, URL and viewport, or artifact hash.
- **Source-verified** — confirmed in an opened, authoritative source. Cite the canonical URL, product/version and relevant section.
- **Inferred** — a reasoned conclusion from listed evidence. State the evidence and what assumption connects it.
- **Unknown** — the needed evidence is unavailable or conflicting. Name the missing evidence.
- **Not run / blocked** — a check or operation did not execute. Give the exact reason; never convert it to pass.

## Method

1. Split the requested outcome into material claims and checks.
2. Inspect current project files and the actual execution output before describing project behavior. For version-sensitive commands, APIs, platform rules, prices, policies or compatibility, open current primary documentation and confirm its version.
3. Attach a source or artifact to every observed/source-verified claim. Separate inference from observation and preserve conflicting evidence instead of choosing a convenient answer.
4. Mark untested routes, unavailable providers and missing permissions as unknown or blocked. Do not say “fixed”, “works”, “deployed”, “installed”, “passed” or “verified” without the matching observed evidence.
5. If a required fact cannot be established, say what is unknown and continue only with independent, safe discovery. Do not invent a tool, version, command flag, result, source line or browser observation.

## Compact claim ledger

Use this for audits, research, deployment, security and any multi-agent handoff:

| Claim | Evidence class | Source / artifact | Confidence | Scope not checked |
| --- | --- | --- | --- | --- |

Confidence describes the strength of the evidence, not certainty in the model. Omit immaterial conversational details; include every decision-driving claim.

## Stop condition

Every material claim has a valid evidence class and traceable support, or remains explicitly unknown/not-run/blocked. No output implies broader verification than the inspected scope.
