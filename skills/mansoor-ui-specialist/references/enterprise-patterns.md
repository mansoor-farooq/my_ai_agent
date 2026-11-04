# Enterprise UI patterns

## Dashboards

- Start with the decisions users need to make, not a fixed KPI-card quota.
- Pair summaries with exceptions, trends, and the next action.
- Use charts only when a relationship is easier to understand visually than in a number or table.
- Empty dashboards should explain what will appear and the action that creates data.

## Data tables

- Keep the header and relevant filter/search row stable while the body scrolls.
- Right-align quantities, currency, percentages, and totals; use tabular numbers.
- Preserve useful density and allow explicit 10/25/50 page-size choices when pagination fits the workflow.
- Use server-side filtering/pagination for large datasets; do not pretend client-side pagination scales indefinitely.
- Make horizontal scrolling intentional and visible. Freeze only columns users must retain for context.
- Provide column-level search only when each field has a meaningful independent query.
- Sorting indicators must reflect actual sort state and remain keyboard operable.

## Forms

- Group fields by business intent, not database schema.
- Keep labels persistent and validation adjacent to the field.
- Use searchable selects for long option sets and native selects for short, familiar lists.
- Distinguish editable, calculated, read-only, and disabled values.
- Preserve entered values after validation or server errors.
- Put irreversible actions away from the primary completion path.

## Navigation

- Match information architecture to jobs and permissions.
- Active state must be clear without relying on hover.
- Desktop sidebars become an accessible drawer or compact navigation on smaller screens; they must not leave blank reserved space.

## Responsive adaptation

- Test real content at narrow mobile, wide mobile, tablet, laptop, and large desktop widths.
- Reflow forms by task sequence.
- Prioritize columns and expose secondary fields through an accessible detail view when needed.
- Avoid nested vertical scroll areas on mobile.
