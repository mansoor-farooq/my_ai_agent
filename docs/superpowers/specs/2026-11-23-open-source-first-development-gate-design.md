# Open-Source-First Development Gate

## Intent

Make the user's default engineering approach explicit and repeatable: before custom implementation, the manager searches relevant public/open-source repositories, studies existing flows and architecture, checks reuse rights and maintenance evidence, and chooses whether to reuse, adapt, take inspiration, or build a narrowly scoped custom module.

## Goals

- Make open-source discovery and inspiration a mandatory pre-implementation gate for custom projects unless the owner explicitly requests scratch-first work.
- Prefer relevant, maintained, license-compatible repositories; treat stars as a discovery signal, never as proof of quality.
- Produce an evidence-backed reverse-engineering map and provenance record that specialists can reuse without rereading repositories.
- Keep custom implementation available when no suitable or compatible source exists.
- Keep the manager as the only approval and dispatch owner.

## Non-goals

- Automatically cloning, copying or vendoring a repository without owner-approved scope and license evidence.
- Treating public code as permission to copy proprietary assets, secrets, customer data or incompatible licensed material.
- Replacing project contracts, security review, tests, or independent verification.
- Building the optional local multi-repository knowledge cache in this gate; that is a later opt-in layer.

## Gate output

The gate emits `mansoor.open-source-gate/v1` with:

- candidate repositories and evidence: URL, owner/name, license, stars, forks, last activity, default branch/commit, matched capabilities and source references;
- a deterministic score and selection reason;
- one decision: `reuse`, `adapt`, `inspire`, or `custom`;
- reverse-engineering targets: modules, data models, workflows, APIs, tests and integration boundaries;
- license/provenance obligations and unresolved gaps;
- an implementation stop condition.

## Decision policy

- `reuse`: compatible license, strong functional match, usable module boundary, and evidence that integration can preserve project contracts.
- `adapt`: compatible or owner-approved source with a strong match but meaningful API, data or UI adaptation required.
- `inspire`: useful patterns or flows but direct reuse is not appropriate because of license, architecture, scope or provenance limits.
- `custom`: no viable source after bounded discovery, or the source cannot satisfy license/security/technical constraints.

Stars and popularity may break ties but cannot override license, security, maintenance, compatibility or evidence gaps.

## Approaches considered

- A prose-only manager instruction was rejected because it is easy to skip and cannot produce deterministic evidence.
- A full automatic repository importer was deferred because it adds storage, refresh, license and supply-chain complexity.
- The selected design is a deterministic gate tool plus a manager skill/router contract; it is fast by default and leaves local repository indexing as an opt-in follow-up.
