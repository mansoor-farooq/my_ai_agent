# Learning Mentor Intelligence Layer

## Intent

Add an automatic, voice-friendly teaching layer to Mansoor AI Team Manager. When the owner's intent is to learn, understand, deep-dive, compare, or ask why, the manager routes to a dedicated learning mentor while keeping the native Antigravity parent chat and sub-agent panel as the only user surface.

The mentor must teach at the owner's current level, ground claims in repository or authoritative research evidence, explain decision logic and benefits, ask useful questions, and finish with a small retrieval check or practical next step. It must not expose hidden reasoning, secrets, raw prompts, or invent research.

## Goals

- Automatic intent detection for phrases such as “samjhao”, “deep dive”, “learn karna hai”, “why did you choose this?”, “teach me”, and equivalent English/Roman Urdu voice transcripts.
- A dedicated `learning-mentor-specialist` under Mansoor AI Team Manager; no second manager and no separate dashboard/panel.
- Twelve custom skills embedded in the mentor profile:
  1. learner-level calibration
  2. intuition-to-precision teaching
  3. Socratic questioning
  4. concept-map construction
  5. evidence-backed research
  6. open-source/documentation study
  7. decision and trade-off explanation
  8. roadmap and milestone design
  9. guided coding walkthroughs
  10. quizzes, prediction and teach-back checks
  11. misconception and error recovery
  12. voice-conversation compression and recap
- Teacher output that is understandable at beginner level but can progressively move to professional depth.
- Project-aware teaching: explain the actual codebase, selected architecture, tools, tests, and observed evidence before general theory.
- Research/documentation artifacts that are concise, source-attributed, redacted, and reusable through project memory.
- A roadmap artifact with prerequisites, milestones, exercises, checks, blockers, and next action.
- A test artifact with retrieval questions, prediction tasks, practical exercises, and answer criteria.
- Decision Q&A: when a design choice is discussed, the mentor explains what was selected, why, alternatives rejected, expected benefit, and what evidence would change the choice.

## Non-goals and safety boundaries

- No new provider, silent model switch, or claim that a local model is intrinsically smarter.
- No separate web dashboard or UI panel.
- No raw chain-of-thought, private reasoning, credentials, customer data, or unrestricted filesystem dump.
- Teaching does not authorize code edits, deployment, Git push, deletion, network expansion, or permission changes. Those remain under the existing Turbo and Antigravity host-selected policy.
- Research uses the existing bounded browser/source tools and open-source-first gate; inspiration is not treated as a license to copy.

## Selected approach

Use the hybrid route:

- **Fast teaching lane:** the manager detects learning intent and returns a short layered explanation, one focused question, and a teach-back check. It can call the mentor for a compact response without changing execution ownership.
- **Deep mentor lane:** multi-turn learning, architecture walkthroughs, course/roadmap requests, research, or repeated “why” questions route to `learning-mentor-specialist` with the twelve custom skills and project context.
- **Execution handoff:** if the learner asks to implement after understanding, the manager creates a normal bounded engineering task and preserves the mentor's evidence and decisions as context; the mentor does not directly bypass the manager.

## Interaction contract

Each teaching turn should contain, as appropriate:

1. **Target:** what the learner will be able to explain, decide, or do.
2. **Level check:** infer from the conversation and ask at most one high-value question when needed.
3. **Layered explanation:** intuition, precise model, concrete project example, then counterexample/failure mode.
4. **Decision logic:** selected option, reason, benefit, trade-off, and rejected alternatives.
5. **Evidence:** observed repository facts, source links, or clearly marked inference.
6. **Check:** one retrieval/prediction/teach-back question; never a large exam dump in voice mode.
7. **Next step:** one practical action or the next roadmap milestone.

Voice mode uses short turns, confirms ambiguous transcription, avoids long enumerations, and supports “pause”, “repeat”, “simpler”, “more technical”, and “quiz me” intents.

## Artifacts and state

Use the existing project identity and memory boundaries. Additive artifacts are:

- `learning/roadmaps/<roadmap-id>.json` — goal, level, prerequisites, milestones, checks, status.
- `learning/lessons/<lesson-id>.json` — concept map, evidence references, decisions, misconceptions, recap.
- `learning/tests/<test-id>.json` — questions, expected concepts, attempts, corrections.

Artifacts store redacted summaries and evidence references, not transcripts or hidden reasoning. They remain project-scoped and are included in native control-plane handoff metadata when present.

## Routing and verification

- Add a deterministic learning-intent route before the general engineering fallback.
- Add the mentor profile to the portable agent allowlist and package manifest.
- Add routing tests for English, Roman Urdu, voice-like short phrases, mixed coding + learning requests, and non-learning requests.
- Add skill contract tests for layered explanation, one-question discipline, evidence labeling, decision rationale, roadmap/test output, and redaction.
- Add artifact tests for project identity, stable IDs, redaction, resumability, and no writes for read-only teaching.
- Preserve all existing hook, Turbo, WSL/Windows, control-plane, and permission tests.
- Package doctor must verify the mentor profile, twelve skill references, portable inclusion, provenance, and manager-only delegation.

## Acceptance

- Saying “mujhe is architecture ko deep dive karke samjhao” automatically routes to the mentor in the native Antigravity conversation.
- The mentor explains at learner level, cites observed evidence, asks why/understanding questions, and produces a teach-back check.
- “Roadmap bana do” produces a project-scoped roadmap with milestones and tests.
- “Is choice ka faida kya hai?” explains rationale and trade-offs without hidden reasoning.
- A later “implement it” returns to the manager's normal bounded execution flow.
- No separate dashboard/panel is created, no permission authority changes, and all existing package/doctor tests remain green.

## Research findings and source boundaries

The supplied sources support a source-grounded, evaluator-backed teacher assistant, but they do not justify claiming universal factual knowledge:

- [ProSchool mentor directory](https://proschool.pk/find-mentors) demonstrates subject and mentor matching across web development, AI/LangChain, SEO, workflow automation and business topics. We use this as a discovery/product-shape reference, not as a curriculum authority.
- [GitHub mentoring-juniors](https://github.com/github/awesome-copilot/tree/main/skills/mentoring-juniors) provides a reusable Socratic mentoring pattern, PEAR (Plan, Explore, Analyze, Rewrite), progressive clues, CTEX prompt teaching, and a no-blind-copy/no-condescension contract. Its source remains attributed and is adapted rather than copied into a private skill without provenance.
- [Learning Commons Agent Skills](https://github.com/learning-commons-org/agent-skills) is Apache-2.0 and provides K-12 lesson planning, differentiation, lesson preparation, and checks-for-understanding with published evaluation rubrics. We can incorporate compatible guidance with attribution and preserve each resource's NOTICE requirements.
- [Learning Commons Evaluators](https://github.com/learning-commons-org/evaluators) provides MIT-licensed evaluator tooling and rubric families for text complexity, feedback, academic standards alignment and durable skills. We use the rubric concepts locally first; API usage remains optional and credential-bound.
- [Sindh Curriculum Directorate](https://dcar.gos.pk/Sindh%20Curriculum.html) is the primary curriculum index for Government of Sindh material, including Computer Science, Mathematics, English, Physics, Chemistry and other grades. Curriculum version, grade, subject and source URL must be recorded for every aligned lesson.
- [Sindh Textbook Board eBooks](https://ebooks.stbb.edu.pk/) exposes a free digital library for ECCE/Katchi through Class XII in Sindhi, Urdu and English, with 194+ listed books. The portal states “All rights reserved”; the agent may link, quote minimally, or use user-authorized local copies, but must not redistribute a scraped book corpus.

The material layer therefore uses a provenance-aware registry: official curriculum/textbook links, open-licensed teaching skills, optional licensed APIs, and user-provided documents are separate source classes. “Knows everything” is represented as broad retrieval and explicit uncertainty, not an unsupported claim of completeness.

