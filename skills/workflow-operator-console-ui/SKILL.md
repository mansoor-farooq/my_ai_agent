---
name: workflow-operator-console-ui
description: Use when a product needs an operations dashboard, approval inbox, execution detail, workflow configuration, audit history, or recovery UI for real automation.
---

# Workflow Operator Console UI

Build an operational product interface backed by real workflow records. A chat transcript or decorative status card is not an operator console.

## Data-backed surface

1. Inspect existing schema/API and implement through the established data path. List and detail views must use persisted execution/approval records with server-side authorization and filters.
2. Provide useful queue views (status, owner, age, workflow, date/search), execution detail (timeline, step, attempts, source links, safe error, next action), and approval/recovery actions allowed by role.
3. Bind each action to a backend command that checks permission, current version and transition rules; update UI from the confirmed server response.
4. Include loading, no-data, stale-data, permission-denied, retryable-error and partial-result states. Never fill production screens with invented records or fake success.
5. Make approval details understandable: what is proposed, data/source, change version, risk, approver role, approve/reject reason and audit record.
6. Keep UI responsive, keyboard accessible, high-contrast, scannable and consistent with the existing design system. Use charts only when they answer an operational question.
7. Browser-test real test-database fixtures at mobile/tablet/desktop widths, including permissions and failed actions.

Before implementing a material visual direction, the manager obtains approval on a visual artifact/blueprint. Product users approve business actions inside the built UI; those approvals are persisted and auditable.
