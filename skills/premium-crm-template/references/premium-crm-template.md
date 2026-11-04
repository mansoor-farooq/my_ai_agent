# Premium CRM Template Reference

This is a decision aid, not a promise that every CRM must contain every screen. Use only the sections supported by the real product scope and repository evidence.

## Product surface map

| Surface | Purpose | Required states |
| --- | --- | --- |
| Workspace shell | Tenant-aware navigation, search, notifications and user menu | loading, unauthorized, compact/mobile navigation |
| Overview | Actionable pipeline, activity and workload summary | no data, filtered data, stale data, failed refresh |
| Accounts / organizations | Customer ownership, profile and relationship history | empty, duplicate warning, archived, permission denied |
| Contacts | People, roles, channels and account association | validation, duplicate match, masked/private fields |
| Leads / opportunities | Qualification, owner, value, source and stage progression | invalid transition, lost reason, optimistic-lock conflict |
| Activity timeline | Calls, meetings, tasks, notes and system events | pagination, missing actor, failed mutation, audit detail |
| Pipeline board or table | Stage-aware work management with filters | drag/drop authorization, bulk action confirmation, retry |
| Customer support | Cases, priority, assignment, SLA and resolution | escalation, reassignment, overdue, closed/read-only |
| Reports | Filtered, exportable, permission-aware aggregates | empty, partial data, date-range validation, export failure |
| Administration | Roles, teams, fields, imports and integration settings | dangerous-action confirmation, audit trail, denied action |

## Contract checklist

- Every record has an explicit tenant or organization boundary when the product is multi-tenant.
- Ownership and visibility rules are enforced server-side, not only by hiding UI controls.
- Stage and status changes are modeled as allowed transitions with actor, timestamp and reason where required.
- Lists use server-side pagination/filtering and preserve query state when opening a detail view.
- Bulk actions have bounded selection, authorization, idempotency and a recoverable result report.
- Imports validate schema, duplicate policy, row-level errors and rollback/compensation behavior before mutation.
- Search exposes only fields the current role may read and does not leak hidden records through counts or autocomplete.
- Audit events identify actor, action, entity, previous value, new value and correlation/request identifier where supported.

## UI composition

Use the existing design tokens first. A premium CRM surface usually benefits from a restrained shell, one strong accent, dense but breathable data tables, clear filter/query controls, focused detail panels, meaningful empty states and consistent keyboard focus. Avoid decorative gradients, fake KPI numbers and card grids that hide the actual work.

For each screen, specify:

1. user goal and primary action;
2. data source and permission boundary;
3. responsive layout at mobile, tablet and desktop widths;
4. loading, empty, denied, stale, error and success states;
5. keyboard, screen-reader and reduced-motion behavior;
6. test fixture or real contract used for verification.

## Delivery evidence

The manager should return:

- observed product and repository facts;
- approved module and screen scope;
- entity/relationship and state-transition map;
- UI blueprint and design tokens;
- API/data mutation contract;
- security and tenancy risks;
- implementation paths;
- focused tests, build checks and known limitations.
