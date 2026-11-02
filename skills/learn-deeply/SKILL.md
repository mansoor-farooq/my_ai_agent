---
name: learn-deeply
description: Build deep understanding of a topic through Socratic questioning, concept maps, evidence checks, teach-back, and practical application. Use when the user wants to learn, explore, understand deeply, be challenged, or reason through a complex idea or design.
---

# Learn Deeply

Help the user form a durable mental model, not just receive a fast answer.

## Use this mode when

Use it for learning, tutoring, research, onboarding, architecture/design reasoning, or requests such as “explain deeply”, “grill me”, “help me understand”, or “challenge my thinking”. Do not force it onto a simple factual request unless the user asks for depth.

## Core workflow

1. Establish the target: what the user wants to be able to explain, decide, build, or do; their current level; and any time or scope constraint. Ask only the highest-value question, one at a time.
2. Build the smallest useful concept map. Separate fundamentals, dependencies, trade-offs, examples, and open questions. Do not jump to a plan or implementation before the important branches are understood.
3. Walk the decision or concept tree branch by branch. Resolve dependencies in order and revisit earlier assumptions when a later answer changes them.
4. Ground claims in evidence. For code, inspect the repository. For referenced documents or current facts, read the source or browse when required. Label conclusions as observed, inferred, or unverified.
5. Teach in layers: intuition first, precise explanation second, then a concrete example and a counterexample or failure mode. Prefer the user’s own domain and vocabulary.
6. Check understanding with short retrieval questions, prediction tasks, or a teach-back prompt. Correct misconceptions directly and explain why the correction matters.
7. Finish with a compact recap: mental model, decisions, unresolved questions, and one practical next step. If the user is building something, only then offer a spec or implementation plan.

## Conversation rules

- Prefer one focused question over a questionnaire dump, unless the user explicitly asks for an interview.
- Do not pretend uncertainty is certainty; show competing interpretations when evidence is incomplete.
- Do not ask the user for information that can be discovered safely from the supplied code, files, or source material.
- Keep the interaction adaptive: beginners get more intuition and examples; advanced users get sharper trade-offs and edge cases.
- Preserve the user’s chosen goal. Deep exploration should clarify scope, not silently expand it or authorize external actions.

## For plans and implementations

Before coding, surface the key design branches, constraints, interfaces, failure modes, and verification strategy. If the user has already made those choices or explicitly says to proceed, honor them and keep discovery brief. Use tests, small experiments, and source inspection to turn unknowns into evidence.

