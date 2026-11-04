---
name: premium-crm-template
description: Use when designing or building a data-backed CRM, customer-operations workspace, sales pipeline, account portal, or reusable premium CRM product template.
license: Proprietary-Private
author: Mansoor Farooq
---

# Premium CRM Template

Use this as a reusable product contract for CRM work. It creates a polished, production-oriented starting point without inventing business data, modules, clients, metrics, permissions, or API behavior.

## Route the work automatically

The manager selects this skill when the request involves CRM, customer management, sales pipeline, accounts, contacts, leads, opportunities, activities, support operations, customer success, or a CRM-like admin workspace. The user should not manually select every skill.

Staff the smallest relevant team:

- `mansoor-ui-specialist` for the shell, navigation, dashboards, tables, boards, detail views, forms and responsive states.
- `saas-architect` for tenant, organization, module and service boundaries.
- `enterprise-schema-architect` for entities, relations, audit fields, state transitions and transactional invariants.
- `workflow-automation-specialist` for reminders, approvals, assignments, notifications, queues and recovery.
- `application-security-reviewer`, backend specialists and `qa-release-specialist` only when the actual scope crosses those boundaries.

## Evidence-first template loop

1. Reconstruct the actual repository, stack, routes, auth model, API contracts, persistence layer and existing design system before proposing screens or tables.
2. Identify the user roles and customer lifecycle from evidence. Keep tenant or organization isolation and server-side authorization explicit.
3. Choose only the modules required by the request and observed contracts. Common candidates are accounts, contacts, leads, opportunities, activities, tasks, notes, pipeline stages, customer support, reports and administration; do not add them automatically.
4. Read [premium-crm-template.md](references/premium-crm-template.md) for the screen, data and verification blueprint. Adapt it to the project instead of copying a generic CRM wholesale.
5. If the visual direction is open, return two or three product-fit design directions with source-backed references, a compact wireframe and trade-offs. Implement after the direction is approved or after the user has already specified it.
6. Preserve existing routes, IDs, validation, permissions, API/database behavior and integrations unless the request explicitly changes them.
7. Verify real loading, empty, denied, stale, validation-error, retryable-failure, partial-result and success states. Never use invented records to make a CRM screen look complete.

## Quality bar

- Prefer a modular monolith or the project's established architecture until measured scale justifies more complexity.
- Use server-side filtering, pagination, sorting and authorization for data-heavy views.
- Use optimistic locking and idempotency for assignments, stage changes, imports, bulk actions and other mutations where the existing system supports them.
- Keep money and quantities in precise decimal types; never use floating-point arithmetic for financial values.
- Preserve audit provenance for customer, ownership, stage, status and permission changes.
- Return a product map, module boundaries, screen map, data contracts, implementation plan and exact verification evidence.
