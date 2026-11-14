# Mansoor AI Team Manager — 99% Production Readiness

## Objective

Move the existing V4/V5 agent hub toward production with risk-adaptive autonomy. The manager may automatically authorize bounded, reversible work; only critical, irreversible, security-sensitive or externally consequential actions require the owner.

## Constraints

- Preserve existing V2/V3/V4 APIs, project routes, business logic and local-first memory.
- No provider bypass, credential extraction, unrestricted native editor control or dark-web sources.
- Keep the provider-free Gemini/Antigravity package portable.
- Hard safety gates cannot be averaged away by a score.

## Tasks

1. Add a deterministic risk-tier policy and Approval Broker under the manager.
2. Bind approvals to exact action manifests, policy versions, hashes, expiry and post-verification evidence.
3. Route routine work through automatic manager authorization; reserve owner approval for Tier 3 effects.
4. Persist policy decisions, approvals, tool calls, evidence and compensations in the existing local/PostgreSQL runtime.
5. Add hidden benchmark cases, red-team fixtures, approval-burden metrics and a 99% readiness gate.
6. Extend RAG/memory evaluation with groundedness, provenance, freshness, contradiction and ACL-leakage checks.
7. Add native-host attestation requirements and fail-closed behavior for missing sandbox/host evidence.
8. Complete Flutter/Android physical-device evidence and signed release/rollback gates.

## Risk tiers

- Tier 0: read-only, retrieval, planning, tests, lint, local sandbox builds and reversible worktree edits.
- Tier 1: draft branches/PRs, non-production test deployment and bounded low-impact changes; notify only.
- Tier 2: pre-allowlisted network/dependency/project changes; manager auto-approves, escalates exceptions.
- Tier 3: production deploy, protected merge, secrets/signing, IAM, destructive data/filesystem work, billing and external communications; owner approval required.

## 99% gate

Weighted readiness index: policy/approval 20%, isolation 20%, durable recovery 15%, engineering success 15%, RAG/memory 10%, observability 10%, mobile/release evidence 10%.

Hard gates: zero Tier 3 unauthorized executions, zero secret/signing-key exposure, zero untraceable external side effects, zero lost approval state, zero failed rollback drills, zero unexplained audit gaps and all mandatory release tests pass.

## Implementation status — 2026-11-14

- **Implemented:** deterministic Approval Broker, Tier 0/1 manager auto-approval, Tier 2 allowlist/owner gate, Tier 3 owner-only gate, manifest-bound receipts, host guard integration, readiness score and project-scoped memory evidence validation.
- **Verified:** 311 full-suite tests with 305 pass, 0 fail and 6 expected opt-in RAG skips; dedicated PostgreSQL RAG gate 8/8 pass with 0 skips; doctor 0 failures/0 warnings; secret scan 0 findings; signed package build passed.
- **Portable artifact:** `dist/mansoor-agent-hub.zip` — SHA-256 `FA69AFB32E681ADCBF884796DBE80785734C2AB987DE66490384D34C8D7607C4`.
- **Still evidence-gated:** native Antigravity editor writes remain host-controlled, Windows isolation depends on the host probe, physical Android/device evidence requires attached hardware, and the owner-approved live benchmark corpus still needs population before a real “99%” score can be claimed.
