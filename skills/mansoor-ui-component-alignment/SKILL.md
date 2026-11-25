---
name: mansoor-ui-component-alignment
description: Use when repeated controls, button rows, form fields, table actions, navigation items, or labels must align consistently across web, mobile, desktop, and native screens.
author: Mansoor AI Team Manager
license: Proprietary (private internal skill)
---

# Mansoor UI Component Alignment

Use this skill whenever repeated controls, button rows, form fields, table actions, navigation items, or labels must look and behave consistently across a screen or platform.

## Contract before styling

- Inspect the existing design tokens and shared component primitives first. Extend the current system; do not add one-off CSS or a parallel component library to fix a single screen.
- Define equivalence groups explicitly: primary actions, secondary actions, icon buttons, form fields, and table row actions have separate sizing contracts.
- Reuse the same component and token for equivalent controls. Match font family, weight, size, line-height, icon size, icon-to-label gap, horizontal padding, border, radius, focus ring, and disabled treatment.
- Give buttons in the same action row a common minimum height and aligned center/baseline. Let width follow content unless the product specifies a shared full-width grid; do not stretch unrelated controls to an arbitrary equal width.

## Text and geometry

- Align text baselines within a control group. Keep icons vertically centered against the line box, not the outer container.
- Use content-driven block sizing. Never clip, overlap, or vertically center-wrap multi-line labels in a fixed-height button.
- Test the longest real label, localization expansion, two-line helper text, validation messages, and empty/loading/error/disabled states.
- Allow grid/flex children to shrink (`min-width: 0`, `min-height: 0` where needed); long identifiers must wrap or scroll within their own bounded region instead of shifting neighboring controls.
- Check narrow mobile, standard mobile, tablet, and desktop widths plus 200% zoom and keyboard focus. Respect safe areas and platform-native touch target guidance.

## Verification and handoff

- Prefer a real browser, simulator, or native preview and inspect screenshots at the target sizes. If no rendered surface is available, report visual alignment as unverified.
- For changed controls, compare computed dimensions/tokens and inspect at least one short-label and one worst-case-long-label state. Use visual regression where the repository already supports it.
- Report exact screens/states inspected, checks actually run, mismatches fixed, and any remaining platform gap. Do not claim pixel-perfect or cross-platform parity from source inspection alone.
- Keep accessibility semantics, keyboard/touch behavior, labels, routes, validation, permissions, and product copy intact while aligning presentation.

Stop condition: no UI alignment change is complete until the affected control group and its worst-case text state have rendered proof or are explicitly marked unverified.
