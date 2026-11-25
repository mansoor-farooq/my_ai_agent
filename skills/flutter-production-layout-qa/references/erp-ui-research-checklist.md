# Flutter ERP/SaaS UI Research Checklist

Use this reference only when the product needs ERP, HRMS, CRM, admin, operations or other data-dense Flutter UI inspiration.

## Search plan

Search in two passes:

1. **Pattern pass:** Flutter adaptive navigation, Material 3 data tables, responsive list-detail, accessible forms, sliver performance and text scaling.
2. **Domain pass:** maintained ERP/CRM/HRMS products, workflow approval queues, inventory/order screens, activity timelines and audit views.

For each useful reference record:

- URL and publisher;
- date/version if shown;
- observed interaction or information-architecture pattern;
- what can be adapted without copying branding or proprietary assets;
- accessibility, responsive and performance trade-offs;
- confidence: observed, strong inference or unverified.

## Flutter screen audit matrix

| Surface | Compact phone | Medium/tablet | Expanded | Failure cases |
| --- | --- | --- | --- | --- |
| Dashboard | stacked summary and one primary action | two-pane summary/detail | navigation rail plus workspace | long metric, empty data, refresh failure |
| List/table | cards or horizontal data view | list-detail split | dense table with filters | overflow, pagination, denied record |
| Form | one column and bottom action | grouped sections | form plus context panel | keyboard, validation, offline submit |
| Workflow/approval | queue cards and detail sheet | split queue/detail | operator console | stale version, retry, unauthorized transition |
| Timeline | compact events | grouped day sections | filterable audit timeline | missing actor, large history, partial load |

Never use fake metrics or placeholder records in a production claim. Use fixture data only in explicitly labelled tests or previews.
