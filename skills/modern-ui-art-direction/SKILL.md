---
name: modern-ui-art-direction
description: Use when a web or app interface needs a distinctive modern visual direction, tech-forward product feel, stronger hierarchy, or a deliberate alternative to generic component-card layouts.
---

# Modern UI Art Direction

Choose a visual system from the product, audience, task and existing brand. “Modern” and “techy” are constraints to interpret, not a license to add neon gradients, glass panels or cards everywhere.

## Workflow

1. **Read the product first.** Inspect routes, current design tokens, real content, component conventions, breakpoints and interaction behavior. Separate facts from inferred design needs.
2. **Name the interface mode.** Decide whether this surface persuades, helps users operate a workflow, supports reading, or showcases an experience. Prioritize conversion, scan speed, comprehension or artifact focus accordingly.
3. **Pick one memorable visual move.** Examples include asymmetric composition, a data-led canvas, controlled translucency, editorial typography, precise geometry, or a restrained luminous accent. Support it with a quiet, coherent system rather than stacking effects.
4. **Make a compact design contract.** Define palette roles and contrast, type roles, spacing/grid, density, surface/elevation, icon treatment, motion, responsive behavior and component states. Use real brand assets; do not invent product copy, metrics, customer logos or screenshots.
5. **Research when the direction is material.** Use `design-reference-research`; cite the actual reference and explain what principle is adapted. Do not clone a competitor screen or copy proprietary assets.
6. **Blueprint before broad UI changes.** Show a small layout blueprint and key component states to the manager. If the user already approved this direction, treat that approval as the gate and proceed without asking them to pick skills.
7. **Critique for sameness.** Compare the proposed composition against a generic SaaS template. Replace any arbitrary repeated cards, gradient wash, tiny uppercase eyebrow labels or decorative blur that do not serve the product.
8. **Verify at real breakpoints.** Check narrow, tablet and desktop widths, long/empty/error/loading states, keyboard focus, reduced motion and text contrast. Prefer WCAG 2.2 AA as the baseline unless the product has a stricter requirement.

## Design contract checklist

- One sentence describing what makes this interface belong to this product.
- Information hierarchy and primary task are obvious within the first scan.
- Tokens have semantic roles; color never carries status by itself.
- Layout and controls remain usable at narrow widths and with zoom.
- Motion has a purpose and respects `prefers-reduced-motion`.
- Decorative depth is restrained; glass effects retain readable contrast and a solid fallback.
- For web surfaces, check Core Web Vitals guidance (LCP, INP, CLS); distinguish lab results from field data and do not claim gains without measurements.
- Existing routes, APIs, validation, permissions and state transitions remain intact.

## Output

Return the design intent, evidence/reference links when used, token summary, compact blueprint, important interaction states, responsive/accessibility checks and any remaining uncertainty. Do not claim visual validation unless screenshots or a live browser were actually inspected.

Accessibility reference: W3C [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/).
Web performance reference: [web.dev Core Web Vitals](https://web.dev/articles/vitals).
