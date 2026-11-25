---
trigger: model_decision
description: Apply when changing a Flutter or mobile application UI, state flow, navigation, API integration, performance behavior, or responsive layout.
---

# Global Flutter and Mobile Standards

Read the existing Flutter architecture, theme tokens, navigation, state
management, API client, and test conventions before adding a widget or screen.
Use the project-context memory and reverse-engineering workflow to avoid
re-reading unrelated modules.

## Feature structure

- Put new behavior in the existing feature/module boundary; do not create a
  second state, API, or design system for one screen.
- Keep widgets focused. Extract a widget when it owns a meaningful state,
  interaction, or layout boundary, not merely to shorten a file.
- Keep network and business rules out of presentation widgets; reuse the
  existing repository/service/provider pattern.
- Reuse theme tokens, shared components, routes, error envelopes, and models.

## Responsive and accessible UI

- Check 360dp and 412dp widths, text scale 1.3x, long labels, empty/loading/
  error states, keyboard/insets, and both orientations when relevant.
- Use constraints, flexible layouts, slivers or scrolling rather than fixed
  heights that can clip content.
- Provide semantic labels, minimum tap targets, readable contrast, and clear
  focus/pressed/disabled states.
- Keep animation purposeful and interruptible; do not add effects that hide
  loading or make interaction slower.

## Data and performance

- Preserve API/auth/cart contracts unless explicitly requested otherwise.
- Model loading, empty, retry, offline, and partial-data states deliberately.
- Avoid rebuilding whole feeds for local selection changes; use stable keys,
  selectors, pagination, caching, and image constraints already used by the app.
- Do not add a package for a small helper without checking existing dependencies
  and the maintenance cost.

## Verification

Run the narrowest meaningful widget/unit tests first, then `flutter analyze` and
the relevant build/test command. Check logs for overflow, dropped frames,
unhandled exceptions, and incorrect route or API behavior. Report visual checks
and limitations instead of claiming them from static code alone.
