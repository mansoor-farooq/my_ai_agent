# Mansoor Farooq — Gemini Project Handoff

**Project path:** `D:\project personnel\mansoortech`  
**Purpose:** Safe, evidence-first handoff for Gemini/Antigravity when cloud chat context is unavailable or limited.  
**Generated:** 2026-10-21 (Asia/Karachi)  
**Scope:** Repository architecture, product intent, operating rules, verified checks, and next-work guidance.  
**Secrets:** This file intentionally contains no passwords, API keys, JWTs, `.env` values, customer secrets, or raw production data.

## How Gemini must use this file

1. Read this file first, then read `AGENTS.md`, `AGENT_RULES.md`, `.agents/memory/project-context.md`, `.agents/skills/task-router/SKILL.md`, the active planner, and the relevant progress entry.
2. Load every skill listed in `.agents/agents/mansoortech-engineer.md` before any edit. The skill gate is mandatory; if a skill is unavailable or contradictory, stop and report it.
3. Re-verify this handoff against current source and runtime. It is a compact index, not a replacement for code, schema, tests, or live evidence.
4. Preserve unrelated working-tree changes. Do not reset, delete, migrate, seed, or deploy without explicit scope and a reversible plan.
5. Report evidence labels exactly: `VERIFIED LIVE`, `TESTS ONLY`, `CODE READ ONLY`, or `NOT VERIFIED`.

## Product identity and goal

The product-facing identity is **Mansoor Farooq**. Repository/package identifiers may remain `Mansoor Tech` unless a separate migration is approved.

Mansoor Farooq is an enterprise SaaS platform for Pakistani SMEs, wholesalers, distributors, retail outlets, service centers, and multi-branch businesses. Its core promise is fast, tenant-safe order-to-cash and stock-to-ledger operations, not disconnected dashboard demos.

Core business value:

- Credit-first commerce with two-way customer/vendor Khata.
- Fast POS and commercial sales with split payments.
- Multi-unit and multi-warehouse inventory.
- Purchase orders, GRN, vendor reliability, reorder automation, and WhatsApp workflows.
- Delivery, rider collection, service/repair, payroll, accounting, audit, reports, onboarding, and support diagnostics.
- Multiple organizations/branches with strict tenant isolation and role/capability governance.

## Current technology contract

- Next.js 16 App Router and Turbopack.
- React 19, TypeScript, Tailwind CSS, Lucide icons.
- Node engine in `package.json`: `>=24.21.0 <25`.
- Prisma 6 over PostgreSQL 17. Current migration directory contains 28 migrations; `npx prisma migrate status` reported the database schema up to date on 2026-10-21.
- Auth uses JWT/session cookies, PostgreSQL-backed revocation, token version checks, proxy guards, and organization membership resolution.
- Existing code areas: `app/`, `components/`, `lib/`, `prisma/`, `models/`, `routes/`, `controllers/`, `middlewares/`, `mobile/`, `test/`, and `test-cases/`.
- Legacy Express/fake-model directories exist for historical context. Do not reintroduce the fake JSON model or silently start a second persistence architecture.

The word “MERN” means React/Node ecosystem guidance in this repository. It does **not** authorize replacing PostgreSQL/Prisma with MongoDB. Financial, stock, ledger, payment, invoice, and tenant-owned data remain PostgreSQL/Prisma unless an explicitly approved architecture decision changes that.

## High-level request/data flow

```text
Browser / POS / mobile client
  -> Next.js proxy and request-size/rate/auth guards
  -> JWT + persistent revocation + active organization membership
  -> tenant resolver (organizationId)
  -> API route / server component / domain service
  -> Prisma transaction with tenant-scoped queries and idempotency where needed
  -> PostgreSQL source of truth
  -> audit/realtime/outbox/read-model updates
  -> safe response and visible UI state
```

External WhatsApp flow:

```text
Meta webhook -> HMAC signature verification -> replay/idempotency check
  -> tenant-safe PO/customer action -> transaction + audit log -> outbox/status tracking
```

## Business modules and important locations

- Authentication/session: `app/api/auth`, `lib/auth.ts`, `proxy.ts`, `lib/route-guards.ts`.
- Tenant and organization switching: `lib/tenant.ts`, `app/api/organizations`, organization UI components.
- POS/sales/invoices: `app/pos`, `app/sales`, `app/api/sales`, sale reversal and return routes.
- Customers and Khata: `app/customers`, `app/api/customers`, `LedgerEntry` and payment routes.
- Vendors and payables: `app/vendors`, `app/api/vendors`, vendor portal and debit-note flows.
- Products/stock/warehouses: `app/products`, `app/inventory`, `app/api/products`, `app/api/inventory`, transfers, batches, expiry, production.
- Procurement/GRN: `app/purchases`, `app/api/purchases`, purchase receive routes, vendor WhatsApp portal.
- Order booking: `app/orders`, `app/api/orders`, status, approval, allocation, pick/pack, dispatch, delivery, COD/collection.
- WhatsApp: `app/api/webhook/whatsapp`, `app/api/whatsapp`, outbox, delivery attempts, HMAC and replay protection.
- Accounting/payroll/reports: `app/accounting`, `app/payroll`, `app/reports`, `app/api/accounting`, `app/api/reports`.
- Onboarding/support/diagnostics: `app/onboarding`, `app/support` or diagnostics pages/routes, import and tenant export endpoints.
- Database contract: `prisma/schema.prisma`, `prisma/migrations/`, `planer/DATABASE_SCHEMA.md`.

## Data and correctness invariants

1. Every tenant-owned Prisma read, update, delete, aggregate, and foreign-ID lookup includes `organizationId` (or an explicitly documented global-by-design reason).
2. Organization admin controls only its own organization. Platform super-admin is a separate control-plane boundary with explicit audit and least privilege.
3. Job titles do not automatically grant access. CEO, CFO, deputy, manager, cashier, order booker, inventory, purchaser, rider, servicing, and auditor must map to capabilities.
4. Hiding a menu item is not authorization. Verify API and direct URL/page behavior.
5. Money, stock, payment, invoice, ledger, delivery, return, and order mutations are transactional, idempotent on retry where appropriate, and auditable.
6. Client-provided organization IDs, role flags, prices, costs, permissions, redirects, and hidden fields are untrusted.
7. Stock never goes negative. Credit limits and order approval state transitions are enforced server-side.
8. Test data must target a database whose name ends in `_test`; never run test/seed scripts against the development database.
9. Schema changes require a named Prisma migration and explicit approval. Never use `prisma db push` for product work.
10. Webhook signatures, timeout behavior, recipient tenant ownership, and idempotency must be verified before external side effects.

## Role and capability model

The governing matrix is `docs/PERMISSIONS.md` and the SaaS plan is `planer/SAAS_READINESS_AND_ROLE_GOVERNANCE_PLAN.md`.

- Platform scope: separate `SUPER_ADMIN` control plane for audited support/tenant operations.
- Organization scope: active membership, organization, status, capabilities, and branch/department scope.
- Job function: Director/owner, CEO/CFO/GM, department manager, cashier/sales/order booker, inventory, purchaser, vendor liaison, rider, servicing, finance, and auditor.
- Multiple managers per department are valid. Approval chains must support delegation, peer managers, deputy escalation, separation of duties, and explicit limits.
- Current navigation and route boundaries must be verified per role, including direct URL/API denial.

## UI and code quality contract

- Prefer Server Components for data loading and static composition; use Client Components only for real interaction/browser APIs.
- Use local state for ephemeral interaction. Use effects only for external synchronization; do not use `useEffect` to compute derived values or mirror props/server data.
- Keep pages cohesive. Split pages that mix fetch/auth, forms, tables, dialogs, and unrelated display logic. Avoid boolean-flag explosions and deeply nested JSX.
- Use progressive disclosure, sensible defaults, existing organization/customer context, inline validation, compact controls, and one obvious primary action.
- Avoid oversized center buttons, decorative effect overload, repeated empty cards, modal stacks, and bulky data-entry flows.
- Every new UI flow needs loading, empty, error, retry, permission-denied, offline/pending, long-content, keyboard/focus, and responsive states.
- “OOP quality” means cohesive domain services, explicit interfaces, typed boundaries, and testable rules. Do not force class hierarchies into functional React components.
- Reuse existing theme, auth, tenant, API, and UI patterns. Do not add a dependency for cosmetic polish without a written reason and approval.

## Agent skills and mandatory project pack

Project-local pack:

- `.agents/skills/project-memory`
- `.agents/skills/logic-debugging`
- `.agents/skills/nextjs-production-engineering`
- `.agents/skills/mern-saas-engineering`
- `.agents/skills/mansoortech-live-verification`
- `.agents/skills/webapp-testing` (Apache-licensed toolkit with retained `LICENSE.txt`)
- Existing `.agents/skills/task-router`, `architecture-review`, `multi-tenant-rbac-audit`, and `realistic-enterprise-ui`.
- `.agents/agents/mansoortech-engineer.md` is the mandatory Mapper → Builder → Verifier lead.

Global skills expected by the agent manifest:

- `project-context-orchestrator`, `reverse-engineering`, `software-architect`, `saas-architecture-engineer`, and `live-web-quality-auditor`.

## Verification commands

Run from `D:\project personnel\mansoortech`:

```powershell
npm exec -- tsc --noEmit
npx prisma migrate status
npm test
npm run test:cases
npm run build
```

`npm test` currently runs the configured suite and then `test:cases`; the latest recorded run on 2026-10-21 reported 357 tests passed and 0 failed, followed by 52 test-case tests passed and 0 failed. This is `TESTS ONLY`, not live browser evidence.

For UI/access/runtime claims, use the local Playwright skill and record URL, role, tenant, action, response, screenshot/console evidence, and failure path. Do not call a unit/type check live proof.

## Current working-tree caveat

At handoff generation, branch is `feature/tier-hierarchy` and the working tree is not clean. Existing modified/untracked items include project agent instructions, `package.json`, `proxy.ts`, `progress/PROGRESS_LOG.md`, authentication files, planning documents, `scripts/check-zero-byte.mjs`, and `.agents/` files. Preserve and inspect these changes; do not reset them.

The planner and README contain some older status/count statements. When they conflict, prefer current source, `git status`, current Prisma migration status, raw test output, and live runtime evidence. Do not repeat a planner percentage as proof.

## Known risks and next priorities

- Build a complete role/capability matrix and live denied-path evidence before broadening permissions.
- Audit every new/changed tenant-owned query for `organizationId` and every foreign ID for same-organization ownership.
- Decompose the largest pages only as focused milestones; do not perform a blanket state/effect rewrite.
- Verify POS, orders, purchase/GRN, delivery/COD, payment, ledger, onboarding, and organization/user creation flows by role.
- Measure queries, locks, connection usage, queues, and cache behavior before adding Redis, replicas, sharding, or microservices.
- Keep support diagnostics and exports tenant-safe and free of credentials/secrets.

## Gemini operating prompt

```text
You are working on the existing Mansoor Farooq project at D:\project personnel\mansoortech.
Read GEMINI_PROJECT_HANDOFF.md, AGENTS.md, AGENT_RULES.md, .agents/memory/project-context.md,
the active planner, and the relevant source before editing. Load every skill in
.agents/agents/mansoortech-engineer.md and list the loaded skills in your evidence map.
Preserve unrelated working-tree changes. Do not use prisma db push, raw schema mutations,
MongoDB rewrites, unapproved dependencies, broad rewrites, or hidden permission changes.
For every task state expected/actual behavior, source-of-truth files, tenant/RBAC impact,
smallest change, tests, live checks, rollback, and evidence labels. Use compact code and
professional responsive UI with minimum data entry. Treat this handoff as an index and
re-verify facts against current code/runtime before claiming anything.
```

## Cloud-chat transfer limitation

A local Markdown handoff can transfer project knowledge, but it cannot automatically retrieve hidden cloud conversation state, provider-side memories, attachments, or cloud-only tool history. To transfer chat context, export or copy only the relevant conversation text into a separate local file such as `GEMINI_CHAT_CONTEXT.md`, redact credentials and personal data, then give Gemini both files. Keep this handoff as the stable repository contract; keep chat context as optional history.
## Expanded dossier index

For product discovery before coding, read these companion files in order:

1. `GEMINI_PRODUCT_DOSSIER.md` — product concept, architecture, data model and current state.
2. `GEMINI_API_SECURITY_MAP.md` — API families, session flow, tenant/security contract and verification matrix.
3. `GEMINI_CORPORATE_REVIEW.md` — readiness classification, gaps and verification program.
4. `GEMINI_DISCUSSION_PROMPT.md` — ready-to-paste Gemini/Antigravity discovery prompt.
5. `GEMINI_CHAT_CONTEXT_TEMPLATE.md` — safe redacted template for selected cloud-chat decisions.

Use the progress log for the exact existing live evidence; do not turn it into a broader claim than the recorded scenario.
