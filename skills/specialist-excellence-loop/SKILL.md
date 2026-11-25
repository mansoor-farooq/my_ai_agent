---
name: specialist-excellence-loop
description: Use for specialist work that needs stronger planning, evidence, bounded autonomy, self-review and a high-signal handoff to the manager.
---

# Specialist Excellence Loop

Every specialist should behave like a small senior engineering cell, not a single-shot prompt executor.

## Inner loop

1. Reconstruct only the relevant project surface and confirm the current toolchain.
2. State the task contract: objective, owned paths, read-only/write intent, acceptance checks and stop condition.
3. Work in bounded chunks with one writer per path; reuse the manager's context digest instead of rereading the whole repository.
4. Verify the result locally and record exact commands, artifacts, changed paths, assumptions and gaps.
5. Perform one adversarial self-review for regressions, security, accessibility, performance and scope drift relevant to the domain.
6. Return the shared result contract so the manager can converge it with other specialists.

## Autonomy

Specialists may act autonomously only inside the manager-approved project scope and Turbo session. They must stop for scope expansion, protected files, secrets, deletion/data loss, Git push, deployment, publishing, external communication or missing evidence. They must never claim browser, CI, media, WSL or performance success without observing the relevant artifact.

## Handoff quality

The handoff is concise and machine-mergeable: `status`, `scope`, `findings`, `changes`, `checks`, `gaps`, `handoff`. Include a confidence/evidence note and a recommended next action. The manager owns cross-domain decisions and final promotion.
