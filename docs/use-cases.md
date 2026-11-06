# Ultra Agent v4.4 Use Cases

These examples describe the intended product behavior without claiming customer results or guaranteed performance.

## 1. Routine Fast fix

**Request:** “Fix the null validation bug in this form and run the focused tests.”

**Flow:** preflight → select UI or backend specialist → inspect affected files → make the smallest change → run targeted verification → report changed paths and result.

**Why it matters:** Fast mode keeps a small task small and avoids loading the entire specialist library.

## 2. Premium architecture change

**Request:** “Add multi-tenant branch isolation without breaking existing routes, IDs or permissions.”

**Flow:** reconstruct current contracts → research current primary sources → present options and trade-offs → wait for approval → delegate schema/API/UI work with ownership → run independent checks → record decisions in project memory.

**Why it matters:** High-impact work gets a deliberate decision gate instead of an unreviewed rewrite.

## 3. UI and browser QA

**Request:** “Make this dashboard feel premium and verify the mobile layout.”

**Flow:** UI specialist reads the existing design system → preserves routes, APIs and permissions → implements the smallest coherent visual change → uses browser-visible QA when available → reports layout evidence and remaining limitations in the parent chat.

**Why it matters:** Presentation improves without silently changing business logic or data contracts.

## 4. Data-backed RAG task

**Request:** “Find where invoice totals are calculated and explain the safest place to add a discount rule.”

**Flow:** resolve canonical project identity → query local PostgreSQL RAG → return path/line/source evidence → check freshness against current files → route implementation to the correct specialist → verify the changed calculation.

**Why it matters:** Retrieval narrows the search while source verification protects against stale memory.

## 5. Security and release readiness

**Request:** “Prepare this change for release and check for secret leakage.”

**Flow:** application-security and QA specialists review the bounded change → redact secret-like values in evidence → run tests, doctor and package checks → create or verify a checkpoint → produce an owner-signed artifact and explicit handoff.

**Why it matters:** Release work is treated as a governed workflow, not a final optimistic message.

## 6. Research before a feature

**Request:** “Before adding this capability, compare current competitors and tell me what we can do better.”

**Flow:** research specialist gathers bounded primary-source evidence → manager records claims separately from verification → presents 2–3 implementation options, risks, differentiation and acceptance criteria → waits for approval before editing product code.

**Why it matters:** Research becomes a decision artifact instead of an untraceable paragraph.

## Team routing cheat sheet

| Need | First specialist |
| --- | --- |
| Product UI, dashboards, design system | `mansoor-ui-specialist` |
| Flutter, Dart, Android | `flutter-mobile-specialist` |
| SaaS, multi-tenancy, API boundaries | `saas-architect` |
| ERP schemas and relationships | `enterprise-schema-architect` |
| .NET / ASP.NET Core | `dotnet-backend-specialist` |
| Node.js / TypeScript | `node-backend-specialist` |
| Python services | `python-backend-specialist` |
| PyTorch, ML, MLOps | `ml-systems-specialist` |
| PostgreSQL and cloud data | `cloud-data-engineer` |
| Workflow automation and connectors | `workflow-automation-specialist` |
| Security review | `application-security-reviewer` |
| QA and release readiness | `qa-release-specialist` |
| Research and documentation | `research-docs-specialist` |
