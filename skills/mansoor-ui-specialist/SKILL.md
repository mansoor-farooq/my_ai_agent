---
name: mansoor-ui-specialist
description: Use when designing, redesigning, auditing, or implementing polished ERP, SaaS, portal, dashboard, table, form, onboarding, authentication, or responsive product UI that must feel distinctive, high-craft, accessible, and production-ready rather than generic or AI-templated.
author: Mansoor Farooq
source: Mansoor Agent Hub private global skill library
license: Proprietary - private distribution only
---

# Mansoor UI Specialist

Create interfaces that feel product-specific and deliberately designed. The goal is not decorative novelty; it is a coherent visual system, strong information architecture, disciplined interaction design, and implementation quality that suggests sustained professional effort.

This skill includes a lightweight reverse-engineering pass. Before copying a reference or changing an existing screen, reconstruct how the current feature actually works so the visual improvement does not break hidden contracts.

## Core principle

Derive the visual language from the product's users, domain, data density, brand, and primary jobs. Never begin from a generic SaaS dashboard recipe.

## Select one mode

| Mode | Use it when | Required output |
|---|---|---|
| Shape | The direction or requirements are unclear | Product context, visual thesis, screen structure, risks |
| Design | A new screen or visual system is requested | Tokens, layout, components, states, responsive and motion specs |
| Critique | Existing UI or screenshots need review | Evidence-based findings, severity, exact fixes, what to preserve |
| Implement | The direction is approved | Minimal code changes, preserved behavior, build and visual checks |
| Polish | The UI works but lacks finish | Targeted hierarchy, type, color, spacing, state, and accessibility refinements |

For a small request, use one mode. Do not simulate a multi-agent debate unless the user asks for it or the surface is broad enough to justify it.

## Workflow

1. **Understand the product.** Identify the users, repeated tasks, data density, device range, brand cues, constraints, and the one outcome the screen must make easy. If the repository already establishes these facts, inspect it instead of asking again.
2. **Reverse-engineer the incumbent.** Read project instructions first, map entry points and routes, trace the target from event/UI to state, controller/service, API/database boundary, and rendered result. Separate observed facts, strong inferences, and unknowns. Check field names, IDs, nullability, pagination, errors, permissions, and side effects before editing.
3. **Inspect the incumbent UI.** Preserve working patterns, content, behavior, IDs, routes, model binding, validation, APIs, authentication, and data contracts unless the request explicitly changes them.
4. **Choose a visual thesis.** Write one sentence tying visual decisions to this product. Define one memorable signature and keep supporting surfaces quiet.
5. **Build a compact system.** Establish color, type, spacing, radius, elevation, icon, motion, and state tokens before styling individual components.
6. **Design complete states.** Include empty, loading, error, disabled, success, hover, focus, selected, overflow, long text, and high-density data states.
7. **Adapt, do not merely shrink.** At each breakpoint, reprioritize content and interaction. Tables may need frozen columns, controlled horizontal scrolling, row summaries, or detail drawers—not arbitrary card conversion.
8. **Verify the result.** Inspect rendered desktop and mobile views, keyboard focus, contrast, overflow, reduced motion, and build output. Never claim a visual or runtime check that was not performed.

## Non-generic design standard

- Avoid default combinations such as Inter/Manrope + blue gradient + identical rounded cards + oversized empty whitespace unless the product context genuinely supports them.
- Do not automatically propose a 12-column grid, 240px sidebar, KPI-card row, Inter, Manrope, or another fashionable UI default. Every structural and typographic choice must cite product evidence. If that evidence is unavailable, state the missing context and offer two meaningfully different directions instead of finalizing one generic system.
- Do not use gradients, glass, shadows, pills, blobs, floating circles, or animation as automatic decoration. Each must communicate hierarchy, state, depth, or brand.
- Use real product content and realistic density. Placeholder dashboards with arbitrary KPI cards are not a design.
- Typography must carry hierarchy: deliberate family, scale, weight, line height, number alignment, and readable measure.
- Data-heavy ERP/SaaS screens must support scanning: stable headers, aligned numbers, clear status semantics, useful filtering, visible selection, and predictable pagination or virtualization.
- Primary actions must be unmistakable; destructive actions must remain semantically red and require proportional confirmation.
- Use sentence case and direct UX copy. Labels describe the user's task, not the backend implementation.

## Motion standard

Motion explains change, preserves spatial context, or confirms an action. Prefer short opacity/transform transitions and component-level state changes. Avoid continuous background motion, staggered animation on every card, and effects that slow frequent ERP tasks. Respect `prefers-reduced-motion` and keep all functions usable without animation.

## Accessibility and quality floor

- Target WCAG AA contrast and visible keyboard focus.
- Use semantic HTML and accessible names before ARIA patches.
- Maintain comfortable hit areas and logical tab order.
- Never encode status by color alone.
- Prevent layout shift, clipped text, hidden controls, nested scroll traps, and fixed elements that cover content.
- Preserve performance: avoid unnecessary libraries, large effects, and framework changes for styling work.

## Progressive references

- For visual-system and component decisions, read [references/design-craft.md](references/design-craft.md).
- For architecture, flow tracing, contracts, and safe reference copying, read [references/reverse-engineering.md](references/reverse-engineering.md).
- For ERP/SaaS tables, forms, dashboards, and responsive patterns, read [references/enterprise-patterns.md](references/enterprise-patterns.md).
- For final critique and verification, read [references/quality-gate.md](references/quality-gate.md).

If `frontend-design` or `impeccable` is available, use it only when its specialty matches the selected mode. This skill remains the governing product-quality contract.
