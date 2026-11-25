---
name: flutter-production-layout-qa
description: Use when building, debugging, or reviewing Flutter screens where responsive layout, RenderFlex overflow, text scaling, ERP/SaaS data density, or production UI reliability matters.
license: Proprietary-Private
author: Mansoor Farooq
---

# Flutter Production Layout QA

Use this skill as the Flutter specialist's reliability gate. It complements the existing Flutter UI skills by turning layout constraints, state coverage, research evidence and verification into explicit acceptance criteria.

## Diagnose before editing

1. Read the exact exception, widget path, file and line. Trace the widget's parent constraints and every child that contributes to its minimum width or height.
2. Reproduce the screen at the failing device size before changing code. Record viewport, text scale, orientation, keyboard/inset state and whether the screen is inside a scrollable.
3. Preserve routes, navigation, state management, API/database contracts, permissions, validation and business logic. A layout fix must not hide a data or authorization defect.
4. For each fix, state the constraint that was violated and why the chosen widget composition resolves it.

## RenderFlex and responsive rules

- Never ship a visible `RenderFlex overflowed` warning. Treat it as a release-blocking defect.
- Use `LayoutBuilder` or adaptive breakpoints when the layout changes by available width, not hard-coded device assumptions.
- Use `Expanded` or `Flexible` only when the child can legally flex; do not wrap an intrinsically sized or unbounded child blindly.
- Use `Wrap`, clipping, truncation with an accessible full-value affordance, or intentional horizontal scrolling for chips, actions and long labels when a single row is not a valid requirement.
- Keep `Row` children bounded inside `ListView`, `SingleChildScrollView`, `Column` and nested flex layouts. Avoid unbounded flex in the same axis as a scrollable.
- Prefer `ConstrainedBox`, `FractionallySizedBox`, `AspectRatio` and `Sliver` layouts over fixed-width panels. Preserve minimum touch targets of 48dp.
- Test long translations, empty values, error messages, large numbers, 1.3x text scale and the smallest supported width; do not rely on one happy-path fixture.

## Premium ERP/SaaS Flutter surfaces

For dashboards, HRMS, CRM, ERP or operations screens:

- Use the project's existing tokens first, then define a compact visual contract for color, type, spacing, elevation, iconography and motion.
- Keep data-dense screens scannable: adaptive navigation, filter/search controls, table/list or board views, detail panels, timelines and clear primary actions.
- Define loading, empty, offline, denied, stale, validation-error, retryable-failure, partial-result and success states before implementation.
- Research inspiration only through bounded `search_web` and `read_url_content` work. Prefer official Flutter/Material guidance and maintained ERP/SaaS references; record URLs, observed patterns and adaptation decisions. Do not copy proprietary UI or invent product facts.
- Ask the manager to involve `premium-crm-template`, `enterprise-erp-reverse-engineering`, `mansoor-ui-specialist` or a backend/security specialist when the request crosses those boundaries.

## Verification gate

Run the narrowest applicable checks and report exact output:

- `flutter analyze --no-pub` with zero new issues;
- focused widget/unit tests, including the failing width and text-scale case;
- golden or screenshot checks when visual regression is part of the request;
- device/emulator smoke check at compact phone, standard phone and tablet/expanded widths when available;
- confirm logs contain no layout overflow, unhandled exception or fake success state.

If a device, API, test database or live reference is unavailable, report that limitation instead of simulating evidence.
