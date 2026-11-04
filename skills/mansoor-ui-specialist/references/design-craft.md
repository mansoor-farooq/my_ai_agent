# Design craft

## Visual thesis

Before selecting colors or components, state:

> This product should feel like **[quality]** because **[users and task]**; its signature is **[one distinctive device]**.

Reject a thesis that could describe any SaaS product unchanged.

Before finalizing a design direction, test it by replacing the product name with an unrelated ERP or SaaS product. If the proposal still reads unchanged, it is not specific enough. Rework the composition, typography, signature element, or interaction model using actual domain evidence.

## Token system

Define only the tokens the surface needs:

- Neutral canvas, surface, elevated surface, border, muted text, body text, and heading text.
- Primary, primary-hover, focus ring, success, warning, danger, and information colors.
- A purposeful type stack and scale for display, page title, section title, body, labels, table cells, and numeric data.
- Spacing rhythm, corner hierarchy, elevation levels, and motion durations/easing.

Use fewer radii and shadows than instinct suggests. A container, control, badge, and modal do not need the same radius or elevation.

Choose typefaces from brand and language requirements. Do not name Inter, Manrope, or a display serif by reflex. When the product has no established typography, explain the selection criteria before naming a family.

## Composition

- Establish a clear reading path before decorating.
- Use alignment and whitespace to express hierarchy; borders and cards are secondary tools.
- Choose one signature element: typography, navigation treatment, data visualization, material texture, or a domain-specific visual motif.
- Keep page titles concise and controls close to the data they affect.
- Dense screens may be compact, but must never feel cramped.

## Interaction states

Specify default, hover, focus-visible, active, selected, disabled, loading, success, warning, and error states. Keep interaction feedback consistent across mouse, keyboard, and touch.

## Motion

- Micro feedback: 100–160ms.
- Common state transition: 160–240ms.
- Panel or route transition: 220–360ms when it preserves spatial context.
- Animate `opacity` and `transform` when possible.
- Do not animate large layout properties on dense tables or forms.
- Provide an equivalent reduced-motion state.
