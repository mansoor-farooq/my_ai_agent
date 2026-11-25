<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Autonomous Skill Routing & UI UX Pro Max Rule
Project-local Antigravity skills are the source of detailed routing guidance. Before product work, load `.agents/skills/task-router/SKILL.md`; then load the relevant architecture, UI, and/or multi-tenant RBAC skill. Read `planer/SAAS_READINESS_AND_ROLE_GOVERNANCE_PLAN.md` for SaaS scope and role governance.

Whenever working on any UI, components, layouts, styling, typography, charts, or user experience:
1. **Automatic Skill Activation:** Automatically apply `ui-ux-pro-max` design intelligence standards without requiring the user to manually specify or prompt for it.
2. **Eliminate AI-Generated Look:**
   - Ban generic floating gradient blobs and identical soft-grey cards without hierarchy.
   - Enforce sharp, high-density enterprise software aesthetics (Stripe/Linear/SAP modern): micro-borders (`border-slate-200/80` in light mode, `border-slate-800` in dark mode), subtle inner highlights, crisp typography scales.
   - Enforce `font-mono tabular-nums` for all quantities, prices, currencies, and timestamps.
   - Maintain strict WCAG AA/AAA contrast ratios and clear tactile interactive states.
3. **Automatic Verification:** Use `gravitas-verification` and headless browser/DevTools testing to verify all flows before marking any UI task complete.


Permanent product identity: use **Mansoor Farooq** always in product-facing UI, documentation, planner content, demos, and Antigravity prompts. Do not silently rename the product to Salesverse, Mansoor Tech, or another name; technical identifiers may remain unchanged unless separately approved.

---

# Maktro MS — Standing Agent Rules
### Read this file at the start of every session, before touching any code.

These rules exist because every one of them was learned from a real mistake made on this project. They are not theoretical.

---

## 1. Never Self-Grade

You (the implementing agent) never get to declare your own work "100% complete," "production ready," or give it a percentage score. That verdict comes only from:
- The user reviewing raw evidence themselves, or
- An independent auditor (Codex, or any tool that did not write the code) re-verifying from scratch.

If you want to report status, report **raw facts**: test output, command output, screenshots/snapshots. Never a summary verdict presented as if it were the conclusion.

**Why:** this project had an agent self-grade its own security work at 92/100 "Enterprise Grade, Production Ready" the same day an independent audit found it was "Not ready for live production deployment," with 5 open P0 blockers.

---

## 2. Evidence Must Be Live, Not Just Code-Level

A passing unit test, a `tsc --noEmit` pass, or a code review ("I added the check, here's the snippet") is NOT equivalent to proof that a feature actually works. Before claiming something is fixed or verified, actually exercise it:
- For backend logic: hit the real API route (not just call the function directly), ideally through a running server.
- For UI/security claims: open a real browser (chrome-devtools-mcp or equivalent), log in as the real role, click the real buttons, and show the result.
- For database claims: query the real database, don't just trust that the code "should" have written the right row.

**Why:** session revocation was claimed fixed from a standalone script test before anyone confirmed the real request pipeline actually called it. Financial statement crashes were only caught once someone opened the actual page in a browser — unit tests had been passing the whole time.

---

## 3. No Unannounced Scope Changes

Never rename a milestone, reorder a plan, add a module that wasn't asked for, or merge new work into the default test suite without first telling the user and getting a go-ahead. If you think something should happen out of order or something extra should be built, **stop and ask** — don't just do it and explain afterward.

**Why:** a milestone was renamed without asking. Multi-Currency was built and merged into the main test suite without being requested, skipping Payroll which the plan had placed first.

---

## 4. Schema Changes: Named Migrations Only

Every schema change goes through `npx prisma migrate dev --name <description>`. Never:
- `npx prisma db push`
- Raw `prisma db execute` run outside the migration folder, especially if the SQL file is then deleted
- Any manual `ALTER TABLE` outside a tracked migration

After any schema change, confirm `npx prisma migrate status` shows the database and migration history in sync, and periodically replay all migrations on a fresh empty database to confirm the migration history is self-sufficient.

**Why:** this exact mistake happened at least twice — once with `WhatsAppMessageLog`'s foreign key, once with a raw SQL file that was deleted after running, leaving no migration record of a real schema change.

---

## 5. Every New Test File Must Be Wired Into `npm test`

The instant you create a new `.test.ts` file, add it to `package.json`'s `test` script in the same task. Do not leave it to be discovered later. If `npm test`'s reported count doesn't match the number of test files in `/test`, something is wrong.

**Why:** this happened repeatedly — Milestone 2's tests, then the M1 accounting tests, were written and passing but silently excluded from `npm test` for a period, meaning a real CI/deploy pipeline would have skipped them entirely.

---

## 6. Security & Tenant Isolation Come Before New Features

Do not build new business features (especially anything touching money, salaries, or customer data) on a foundation with known open security or tenant-isolation gaps. If a security audit is pending or has open findings, that work takes priority over the next planned milestone.

---

## 7. UI Simplification Is Presentation-Only

When working on UI/UX, plain-language, or role-based navigation tasks: do not change API contracts, validation rules, permission checks, or audit logging as a side effect. Hiding a menu item from a role's navigation is not the same as blocking that role from the underlying route — both must be verified independently (see Rule 2).

---

## 8. Language & Tone

The application is **English-only** — no Urdu, Roman Urdu, or translation library/dependency anywhere in the UI. "English" means **plain, everyday words**, not technical or accounting jargon on non-owner screens:
- Say "Customer Owes You: Rs. X", not "Accounts Receivable: Rs. X"
- Say "Stock Running Low", not "Reorder Point Breached"
- Say "Out of Stock, Restock First", not "Insufficient stock exception"
- Never show a raw database enum (`PARTIAL`, `IN_PROGRESS`) directly in UI — always map to a human label.
- Formal/technical terms are allowed only on Owner-only Accounting/Settings screens.

---

## 9. Progress File Discipline

Every task updates the relevant `progress/plan-N-progress.md` file with what was actually done, what was tested, and what's still open. Don't mark something `[x]` done unless it has been tested per Rule 2. Open questions and known limitations get logged, not silently dropped.

---

## 10. When In Doubt, Stop and Ask

If a prompt is ambiguous, if a fix touches something outside the stated scope, or if you're not sure whether something counts as "done" — stop and ask the user rather than guessing and proceeding. An incomplete task with a clear question is better than a completed-looking task built on a wrong assumption.

---

## 11. Evidence Labels Are Mandatory and Strict

Every claim in a report carries exactly one label:
- **VERIFIED LIVE** = a real browser session or real HTTP request against a running server, with raw output pasted.
- **TESTS ONLY** = automated tests or scripts that call code directly. Not live proof.
- **CODE READ ONLY** = you read the code but did not run it.
- **NOT VERIFIED** = anything else.

A one-off script that imports functions does not count as VERIFIED LIVE. If unsure, use the weaker label. Never give a percentage or "production ready" verdict (Rule 1).

**Why:** a role-hierarchy check done with a temporary script was labelled VERIFIED LIVE, and a "full" module list was marked Fully Working after only two test files were run.

---

## 12. Tenant Isolation: Every Query, Every Time

- Every Prisma query on a tenant-owned model (customer, vendor, product, sale, order, purchase order, inventory, ledger, employee, membership, etc.) must include `organizationId` in `where`. This includes `update`, `delete`, and lookups by `id`.
- Never use `findUnique({ where: { id } })` alone on a tenant model. Use `findFirst({ where: { id, organizationId } })`, or `updateMany`/`deleteMany` with `organizationId`.
- Any ID that comes from the request body, URL, or webhook payload (recipientId, productId, warehouseId, userId, etc.) must be checked to belong to the caller's organization before use.
- Every new API route ships with a two-organization test: Org A's user must get 403/404 on Org B's record, proven through the real route.
- Intentional global queries (login by email, token revocation, super admin) must carry a comment `// GLOBAL BY DESIGN: <reason>`.

**Why:** an audit found unscoped vendor and customer lookups in the WhatsApp route and an unscoped purchase order query in the reorder detector.

---

## 13. One Permission Matrix, Changed Deliberately

- Roles, hierarchy tiers, allowed modules, and menu visibility must come from one documented source of truth (the matrix in `docs/PERMISSIONS.md`, mirrored in code). Do not scatter role checks across pages.
- Any change to roles, tiers, `proxy.ts`, `lib/auth.ts`, `lib/route-guards.ts`, or the Sidebar needs prior approval (Rule 3), an updated matrix, and a live test per role: menu items shown plus direct-URL result for every protected route.
- Hiding a menu item never replaces blocking the route and the API (Rule 7).
- Changing a user's role, tier, manager, or organization membership must be checked against the caller's own organization and rank. No one can grant a role above their own, and no one can touch another organization's members.

---

## 14. Commit Hygiene

- Commit after every task that has passed its checks. Never leave a big pile of uncommitted changes across many tasks.
- A schema change and its migration folder are committed together, in the same commit.
- Work on a named branch. No direct work on `main`.
- Automation or bot PRs (Bolt, Dependabot, etc.) merge only after `npm test` and `tsc --noEmit` pass on the merged result.
- Do not upgrade major dependencies (Prisma, Next.js, TypeScript) without asking. After any upgrade, run the full suite and a fresh-database migration replay.

---

## 15. Task Start and Task End Gates

**Before coding**, write down: which rules apply, which files you plan to touch, and which tests you will add. If you need to touch any file outside the ask, stop and list it. Wait for an explicit "yes" (Rule 3).

**Before reporting done**, paste the raw output of:
- `git status` and `git diff --stat` (the file list must match the task; explain every extra file)
- `npm test` totals (count must go up when you added tests, Rule 5)
- `npx tsc --noEmit`
- `npx prisma migrate status`
- A confirmation that no `db push` or raw SQL was used

---

## 16. Test Data and Scripts Stay Out of the Dev Database

- Tests and bulk seed scripts run only against a separate test database (`DATABASE_URL_TEST`). Never against the development database.
- Remove the `prisma:push` script from `package.json`. Do not add scripts that bypass migrations.
- One-off scripts go in `scripts/` with a one-line header comment saying what they do. Delete temporary scripts when the task ends.
- Do not leave dead legacy files in the repo root (`app.js`, `patch*.py`, etc.). Move them to `scripts/archive/` or delete them.

---

## 17. New Modules Must Fit the Simple UI

- A new page or module is not done until it is placed in the role-based navigation (Counter / Manager / Owner) and tested per role.
- Counter mode stays at 7 items or fewer. Manager mode shows only what a manager needs daily, and the rest goes under "More".
- Every screen needs plain-English labels (Rule 8) and clear errors on empty or invalid forms. No silent failures.
- Before any UI change is called finished, run the demo with a non-technical person, or write down the exact steps a new user would take.

---

## 18. Webhooks and External Calls

- Inbound webhooks (WhatsApp, payment gateways) must verify the provider's signature or verify token before doing anything. Tenant is derived from verified data, never from unverified payload fields.
- Outbound sends (WhatsApp, email, SMS) must confirm the recipient belongs to the calling organization (Rule 12).
- Every external call has a timeout and a clear mock/live flag. Report which mode was actually exercised.

---

## How to Use This File

Paste this at the start of any new task prompt, or simply say: "Follow `AGENT_RULES.md`" and reference it alongside whatever plan file you're working from (`plan-2.md`, `plan-3.md`, `plan-4.md`, etc.). These rules apply regardless of which plan or milestone is active.
## Mandatory Antigravity skill gate

For every product, code, UI, API, database, test, or configuration task, Antigravity must load and apply all skills listed in `.agents/agents/mansoortech-engineer.md` before editing. This includes the project memory, reverse-engineering, debugging, software architecture, Next.js/UI, MERN/SaaS, RBAC, live verification, webapp-testing, and omniroute-gateway skills. The agent must list the loaded skills in its first evidence map. If any required skill is unavailable or contradictory, it must stop before editing and report the blocker. This gate is mandatory; it is not an optional recommendation.

## OmniRoute/Antigravity integration gate

Use the project-local omniroute-gateway skill and omniroute-gateway-operator subagent for gateway/provider/Antigravity work. Keep OmniRoute outside the repository, bind local services to loopback by default, never commit credentials, and use the supported Antigravity MITM/bridge flow rather than inventing a custom editor base URL. OAuth requires explicit user browser consent.`r`n