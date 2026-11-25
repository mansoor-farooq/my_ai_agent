# Mansoor Farooq Product & Architecture Dossier

**Project:** Mansoor Farooq  
**Repository:** \`D:\project personnel\mansoortech\`  
**Prepared:** 2026-10-21 (Asia/Karachi)  
**Audience:** Gemini / Antigravity and the product owner  
**Purpose:** A single, evidence-first document that explains what the product is, how the current code works, what is actually implemented, what is partial, and what must be decided before more feature work.

> This document is a repository dossier. It is not a claim that every runtime flow has been verified. Evidence labels are mandatory:
> - **VERIFIED LIVE:** observed through a running app/browser/API with recorded evidence.
> - **TESTS ONLY:** supported by automated test output, not live browser proof.
> - **CODE READ ONLY:** inferred from current source/schema, not executed in this review.
> - **NOT VERIFIED:** no sufficient source or runtime evidence yet.

## 1. Product intent

Mansoor Farooq is intended to become an enterprise SaaS operating system for Pakistani SMEs, distributors, wholesalers, retailers, service centres, and multi-branch businesses. The product is not only a POS screen. Its business loop is:

\`\`\`text
Organization setup
  -> people, roles, departments, stores/warehouses, territories
  -> catalog, units, prices and inventory
  -> purchasing and receiving
  -> POS / order booking / delivery
  -> customer and vendor Khata
  -> payments, credit and balance
  -> reports, accounting, payroll and audit
  -> reorder automation and WhatsApp workflows
\`\`\`

The product owner’s current concept includes:

- A normal customer experience for direct shopping/order placement.
- An order-booker experience in which a field/order-booking user chooses a customer, sees customer-specific pricing, can negotiate a special price within controlled rules, and creates an order on behalf of that customer.
- An organization-level administrator who configures that organization.
- A future platform/super-admin control plane that can inspect and govern all organizations.
- Multiple companies, stores, warehouses, branches, departments, and managers.
- A hierarchy such as director/owner, CEO/CFO/GM, deputy, department managers, staff, order bookers, inventory, purchasing, riders, servicing, finance, and auditors.
- A credit-first Khata/balance model with ledger entries, payments, credit limits, approval, and auditability.
- Professional, compact, responsive UI with minimum data entry and visible continuity across flows.

The exact hierarchy and branch semantics are still a product decision. They must not be guessed by an implementation agent.

## 2. Current technology and architectural shape

Evidence: **CODE READ ONLY** (with automated checks listed later).

- Next.js 16 App Router and Turbopack.
- React 19 and TypeScript.
- Tailwind CSS and Lucide icons.
- Node \`>=24.21.0 <25\`.
- PostgreSQL 17 accessed through Prisma 6.
- JWT-based authentication, HTTP cookies/Bearer fallback, PostgreSQL-backed token/session revocation, active organization membership, and proxy-level guards.
- Domain areas under \`app/\`, \`components/\`, \`lib/\`, \`prisma/\`, \`models/\`, \`routes/\`, \`controllers/\`, \`middlewares/\`, \`mobile/\`, \`test/\`, and \`test-cases/\`.
- The repository contains historical Express/fake-model directories. They are reference context only; PostgreSQL/Prisma is the current financial and tenant source of truth unless an approved architecture decision changes it.

### Current request path

\`\`\`text
Browser, POS or mobile client
  -> Next.js proxy
     - CORS/preflight
     - 2 MB request-size limit
     - client-IP resolution
     - rate limit
     - temporary IP/user lockout
     - JWT signature/expiry/version gate
  -> route authentication
  -> active organization membership resolution
  -> tenant-scoped API/domain logic
  -> Prisma transaction and PostgreSQL
  -> audit, ledger, outbox, realtime/read-model updates
  -> typed response and explicit loading/error/empty state
\`\`\`

External WhatsApp path:

\`\`\`text
Meta webhook
  -> HMAC signature verification
  -> replay/idempotency guard
  -> tenant-safe business action
  -> transaction + audit
  -> outbox/status tracking
\`\`\`

The source-of-truth order is: current source and schema, current migration status, raw test output, then planner/README claims. Older planner percentages are not proof.

## 3. Core domain model

### Tenant and identity

- \`Organization\`: the primary tenant/business boundary. It has a unique slug, contact/address/city/currency/status, module settings, and relations to business records.
- \`User\`: global identity with email/password, role, designation, department, hierarchy level, and optional manager (\`reportsTo\`) relation.
- \`OrganizationMembership\`: the tenant-specific authority record. It links a user to an organization with role, designation, department, hierarchy level, and status.
- \`RevokedToken\` and \`UserRevocation\`: persistent session invalidation.
- \`SuperAdmin\`: separate platform control-plane identity.
- \`AuditLog\`: security and business audit trail.
- \`TenantSubscription\`, \`SubscriptionPlan\`, \`TenantUsage\`, \`BillingEvent\`, \`TenantPlacement\`: subscription, quota, and possible future placement/partitioning concerns.

### Commerce and operations

- \`Product\`, product category/units/cost/selling/reorder data.
- \`Warehouse\`, \`InventoryItem\`, stock movements, batches, unit conversions, transfers.
- \`Customer\` and \`Vendor\`.
- \`Sale\`, \`SaleItem\`, \`Payment\`, returns and reversal.
- \`PurchaseOrder\`, GRN/receiving, landed cost, vendor reliability.
- \`LedgerEntry\`, expenses, accounting periods and locks.
- \`SalesOrder\` and items for order booking, approval, allocation, pick/pack, dispatch, delivery and COD/collection.
- \`Territory\` and \`Beat\` for field coverage and customer assignment.
- Payroll, servicing, production, BOM/work orders, reports and realtime.

### Branch decision that remains open

Static source search found no first-class \`Branch\` model, \`parentOrganization\`, or explicit organization type. Current code has:

- \`Organization\` as the tenant/business entity.
- \`Warehouse\` as a stock/storage/location entity.
- Stock transfer support between warehouses.
- Organization switching and tenant membership.

Therefore “branch” currently appears to be represented as either a warehouse or a separate organization. This is **PARTIAL / DECISION REQUIRED**. Before building 60+ companies/branches, decide and document:

1. Is a branch a child of one legal company?
2. Does each branch have its own warehouse, users, ledger, pricing, customers?
3. Can one user work in multiple branches?
4. Is stock shared, transferred, or independently owned?
5. Are reports consolidated at company level?
6. Is a customer global to a company, branch-local, or both?
7. Does a branch have its own tax/currency/address/approval chain?
8. Is an organization the legal company, the operating tenant, or the store?

Do not silently add a branch table until this decision is approved. Do not pretend that multiple warehouses automatically provide full branch governance.

## 4. Authentication and session flow

Evidence: **CODE READ ONLY**.

1. Login route validates the supplied credentials.
2. A JWT is signed with the configured secret and expires in seven days.
3. The payload includes \`userId\`, \`email\`, \`name\`, \`activeOrgId\`, role, hierarchy level, designation, department, reports-to information, token version and standard JWT timestamps.
4. \`signToken\` rejects an empty or \`org_default\` active organization.
5. The token is normally stored in the \`mansoor_tech_token\` cookie. Bearer authorization is also accepted.
6. \`active_org_id\` stores the selected organization context.
7. \`getCurrentUser\` reads cookies or Authorization, verifies signature/expiry/version, and checks persistent revocation.
8. \`getAuthSession\` re-resolves the active \`OrganizationMembership\` and uses membership authority, rather than trusting a client-provided role.
9. Logout/revocation can invalidate one token or all sessions for a user.
10. Changing a user’s role, hierarchy, status or similar authority fields revokes their sessions.
11. Organization switching checks active membership and active organization status, re-signs the JWT with the target membership authority, and updates the organization cookie.

Important security rule: the client may display a role, organization or price, but the server must recompute authority, organization ownership and commercial amounts.

## 5. Organization and onboarding flows

### Public/tenant onboarding

\`POST /api/tenants/onboard\` creates a new tenant in a transaction. The request is expected to provide business name/slug, owner name/email/password, phone and city. Production requires the configured onboarding secret in \`x-onboarding-secret\`; the route also rate-limits and validates duplicate slug/email cases. The transaction creates:

- Organization
- Owner user with ADMIN and hierarchy level 1
- Organization membership
- Main warehouse
- Trial subscription
- Trial-start audit/billing event

Evidence: **CODE READ ONLY**. Production runtime proof is still required.

### Authenticated organization creation

\`POST /api/organizations\` creates an organization for an authenticated user, creates the caller’s membership, and creates a default warehouse. It is organization creation, not a complete company/branch onboarding wizard. It generates a unique slug suffix.

### Organization switching

\`POST /api/organizations/switch\` requires active membership. It verifies the target organization and active organization status, re-signs the session context, and updates cookies. Every organization-scoped query must use the switched organization, never only a user-global id.

### Template/readiness onboarding

The onboarding template and readiness endpoints are tenant/admin scoped. They can seed templates, products, warehouses, territories and beats and report readiness. Treat seeded content as development/bootstrap data until verified in a controlled environment.

## 6. Users, roles and authority

Current persisted role enum is coarse: \`ADMIN\`, \`SALES\`, \`INVENTORY\`, \`SERVICING\`. The richer business titles are represented by designation, department and hierarchy level. That is a useful foundation but it is not yet a complete capability system.

Current governance described by \`docs/PERMISSIONS.md\`:

- Level 1: Director/Owner.
- Level 2: CEO/CFO/GM or executive authority.
- Level 3: department managers and staff leads.
- Level 4: operational staff.

Authority rule:

\`\`\`text
L1 can create/edit all
L2 can manage L3 and L4
L3 can manage L4
L4 cannot assign authority
\`\`\`

Current user creation/update logic checks:

- caller is organization ADMIN,
- target membership belongs to the active organization,
- caller rank is higher than target,
- ADMIN assignment is limited to upper hierarchy,
- reports-to user belongs to the same organization,
- manager cycles are rejected,
- the last remaining director cannot be demoted/deactivated/deleted,
- authority changes revoke sessions.

This is **PARTIAL** for the product’s intended enterprise role model. A future capability matrix should separate:

- platform scope,
- company scope,
- branch/warehouse scope,
- department scope,
- action capability,
- approval limit,
- data visibility,
- delegation and expiry,
- audit requirement,
- separation of duties.

Job title alone must never grant access.

## 7. Order-booker and normal-customer concept

The requested product concept has two user journeys:

### Normal customer

- normal authenticated customer experience,
- browse catalog,
- see standard price,
- add to cart,
- checkout/payment or COD as allowed,
- see own orders, balance and history.

### Order booker

- field/order-booking role,
- selects the customer before order creation when required,
- keeps the selected customer in session/context until customer change or completed checkout,
- sees customer-specific price rules,
- can request or apply a special price through a server-authorized endpoint,
- special price is scoped to customer/product/variant/order-booker and logged,
- changing customer clears/reloads customer-specific prices,
- checkout uses the effective price and preserves the price/audit connection.

The existing repository has order, customer, ledger, price and approval concepts, but the exact end-to-end order-booker runtime must be live-tested. It is **PARTIAL / NOT VERIFIED** until the complete journey is demonstrated with two customers and a price reset/change.

Never trust a client-side “order_booker=true” flag for authorization. Resolve it from server identity/membership/capability.

## 8. API map

The current \`app/api\` tree includes these families:

- Auth: \`/api/auth/login\`, logout, me.
- Organizations/tenants: organizations, current, switch, tenants onboard/export, admin tenants.
- Users and RBAC: users, admin impersonation/login, banned IPs.
- Catalog and inventory: products, inventory, batches, sync, transfers.
- Customers/vendors: customers, customer payment, vendors, vendor portal.
- Sales and POS: sales, reverse, returns, register, orders and order lifecycle.
- Order booking: orders, approval, allocation, delivery, dispatch, pick/pack/status.
- Procurement: purchases, adjustments, landed cost, receive, send-whatsapp.
- Ledger/accounting: accounting reports, FX revaluation, period locks, expenses.
- Reports: collections, lost-sales, monthly performance, operational exceptions, rider/route/shop reorder.
- Subscription/quotas: plans, status, subscription checks.
- Onboarding: templates, apply-template, readiness checklist, import.
- Security/diagnostics: health, audit logs, diagnostics, security alerts.
- External workflows: WhatsApp webhook, outbox, retry, dispatch, realtime.
- Payroll, production, servicing and portal APIs.

For every endpoint, Gemini must record:

\`\`\`text
method
route
authentication required?
platform/org/branch/department scope
allowed capability
request validation
server-owned fields
transaction/idempotency boundary
response contract
audit event
failure states
rate limit / webhook / secret rules
tests and live evidence
\`\`\`

A route inventory alone is not API contract proof. The next verification pass must generate an endpoint matrix from route source plus tests and live calls.

## 9. Data ownership and tenant isolation

The intended invariant is:

\`\`\`text
organizationId is mandatory on every tenant-owned read, update,
delete, aggregate and foreign-id lookup, unless the route is explicitly
global-by-design and audited.
\`\`\`

Client-provided organization IDs, role flags, price fields, costs, permissions and hidden inputs are untrusted. Foreign records (customer, product, warehouse, order, payment, vendor, employee) must be verified as belonging to the active organization before use.

The schema has nullable organization IDs on several business models. That creates a review risk even when routes currently scope many queries. This must be audited explicitly rather than assumed safe.

## 10. UI/product-quality contract

The desired UI direction is premium but operational:

- compact forms and progressive disclosure,
- defaults from current organization/customer context,
- one obvious primary action,
- responsive 360px-to-desktop layouts,
- real loading, empty, error, retry, denied, offline/pending and long-content states,
- no decorative effect overload or oversized demo buttons,
- consistent theme tokens and typography,
- keyboard/focus and accessible labels,
- tables/cards that preserve data hierarchy,
- prices/quantities/timestamps rendered with tabular numeric alignment where appropriate.

Use Server Components for stable data composition and Client Components for actual interaction/browser APIs. Do not use effects to derive ordinary state. Do not force class-heavy OOP into React UI; keep domain rules in typed services and pure functions.

## 11. Current verification snapshot

Recorded automated results on 2026-10-21:

- \`npm exec -- tsc --noEmit\`: pass — **TESTS ONLY**
- \`npx prisma migrate status\`: 28 migrations, database up to date — **TESTS ONLY**
- \`npm test\`: 357 passed, 0 failed — **TESTS ONLY**
- \`npm run test:cases\`: 52 passed, 0 failed — **TESTS ONLY**
- \`git diff --check\`: pass — **TESTS ONLY**

No statement above is a substitute for browser/API runtime evidence. Live verification still needs a controlled test environment and test accounts.

## 12. What is implemented, partial, planned

### Implemented foundation (source/tests support it)

- Next.js/Prisma/PostgreSQL application shell.
- JWT signing, expiry, token version and persistent revocation.
- Active organization membership and organization switching.
- Coarse RBAC and hierarchy-aware user management.
- Organization onboarding transaction with owner, membership, warehouse and trial.
- Catalog, inventory, POS/sales, purchasing/GRN, customer/vendor ledger, orders, reports, accounting and external workflow route families.
- Automated test suites currently passing.

Evidence: mostly **CODE READ ONLY** and **TESTS ONLY**.

### Partial / requires live proof or product decisions

- Full order-booker customer-selection and customer-specific pricing journey.
- Branch/company hierarchy and consolidated reporting.
- Fine-grained capabilities beyond coarse roles.
- Platform super-admin operating model and support boundaries.
- Complete API contracts and idempotency matrix.
- Mobile/offline sync and realtime operational behavior.
- Production deployment, observability, backups, queue workers and scaling measurements.
- Corporate-grade UI consistency across every route.

Evidence: **PARTIAL / NOT VERIFIED**.

### Planned or decision-required

- Explicit branch model or formally documented warehouse-as-branch model.
- Capability/approval policy tables and delegation.
- Billing/plan enforcement and quota behavior.
- Data retention, export/import, incident response and tenant deletion policy.
- SLOs, error budgets, performance budgets and capacity tests.
- Full live role/tenant isolation matrix.
- Formal threat model and independent security review.

## 13. Highest-risk architecture questions before more coding

1. What is the legal tenant boundary: company, customer account, store, or branch?
2. Is a branch a child of an organization, a warehouse, or a separate organization?
3. Which data is global to a company and which is branch-local?
4. How can a user belong to multiple organizations/branches?
5. Which role/capability may approve price changes, credit, discounts, payments, stock adjustments and order release?
6. How are order-booker customer selection, price overrides, checkout and audit linked?
7. What is the source of truth for price: catalog price, customer price list, negotiated price, or order snapshot?
8. What data is allowed to be shared with the platform super-admin?
9. What is the backup/restore and tenant export contract?
10. Which flows must work offline or on poor connectivity?
11. What are the target user/organization/product/order volumes?
12. Which APIs are public, internal, mobile, webhook, or admin-only?

## 14. Required next discussion sequence

Gemini should not start by rewriting code. Use this sequence:

1. Read this dossier, \`GEMINI_API_SECURITY_MAP.md\`, \`GEMINI_CORPORATE_REVIEW.md\`, and \`GEMINI_DISCUSSION_PROMPT.md\`.
2. Build an evidence table from source, schema, tests and live calls.
3. Ask the product owner to decide tenant/company/branch semantics.
4. Freeze the role/capability and approval matrix.
5. Freeze the order-booker pricing/order lifecycle.
6. Produce an API contract matrix and tenant-isolation checklist.
7. Create a staged implementation plan with rollback and test cases.
8. Only then edit application code.

## 15. Sensitive data rule

Do not put passwords, JWTs, API keys, \`.env\` values, raw production dumps, customer PII, or private cloud transcripts into this dossier. Use redacted examples and a separate, user-controlled context file if needed.

## 16. Existing live evidence already recorded

Progress log entries for 2026-10-16 contain **VERIFIED LIVE** evidence for several security paths:

- Trusted-proxy client-IP behavior: unknown forwarded IPs do not create a shared ban; trusted proxy hops resolve correctly; one client can be banned without blocking another.
- Cross-organization switch: a user with memberships in two organizations received a new token carrying the target organization and target membership role; restricted routes returned 403 in the lower-authority organization.
- JWT hygiene: fallback/hardcoded secrets were rejected in development and production start modes; the configured secret was accepted.
- Suspended membership: authenticated API calls returned 403 and the browser redirected to login without a redirect loop.
- SALES role boundary: POS page/sale remained available while accounting period-lock and audit access returned 403.

These are **VERIFIED LIVE** only for the exact scenarios recorded in `progress/PROGRESS_LOG.md`. They do not prove every endpoint, tenant query, branch flow, order-booker flow, or UI state.
