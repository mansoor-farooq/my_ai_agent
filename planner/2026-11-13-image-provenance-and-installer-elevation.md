# Image provenance and one-click installer — 1.18.0

## Goal

Make image work consistent and fast: distinguish authorized source reuse from public inspiration and new decorative generation, preserve the user's exact image brief, and prevent long native-generation loops. Make the portable installer request administrator permission automatically when required.

## Implemented

- `skills/production-image-generation/SKILL.md` now requires one intent classification: exact authorized source reuse, inspired original, or new decorative generation.
- Public references are inspiration-only when ownership/authorization is unclear; source URL, authorization boundary, local path and hash are recorded.
- Exact brand copy, exclusions, target surface, aspect ratio, safe area and final target-size inspection are mandatory.
- `agents/Antigravity/custom-agents/production-orchestrator/agent.md` enforces the same image contract in the manager fast path.
- Generated `Install-Mansoor-Agent-Team.ps1` now self-elevates through Windows UAC (`Verb RunAs`) when the one-click `.cmd` launcher is not elevated.

## Verification

- Native activity/image policy tests: 8/8 pass.
- Portable package test/build suite: 203 total, 197 pass, 0 fail, 6 default-gated RAG skips.
- Doctor: 20/20 pass.
- Package version: 1.18.0.
- ZIP SHA-256: `7C8BDC042B3626845F3DD48DAF6D2839B7770ABC218F3E2AB3C57E56FFDF0369`.

## Boundaries

- The kit cannot grant rights to third-party assets; unauthorized public images remain inspiration-only.
- The kit cannot force a provider model, quota or native image-tool completion time.
- Live Antigravity installation remains a separate host action while the application is running.
