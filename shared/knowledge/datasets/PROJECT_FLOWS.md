# Project flow dataset

Historical handoff, prepared 2026-11-02. These routes and decisions come from archived work and a targeted file inventory. Confirm them against the current checkout before making changes. The full supporting summaries live under `codex-memory/rollout_summaries/` and the conversation indexes point to the original chats.

## Cartivo (Flutter, original folder `my_cafa`)

**Code entry map:** `lib/state/cart_manager.dart`; `lib/screens/cart_screen.dart`; `lib/screens/checkout_screen.dart`; `lib/services/order_checkout_service.dart`; `lib/services/order_sync_engine.dart`; `lib/services/sync_coordinator.dart`; `lib/data/local_order_repository.dart`; `lib/core/network/order_api_client.dart`.

**Order flow:** catalog/product choice → active cart with IDs, variants and current effective prices → editable checkout → shipping/payment/confirmation → online API or durable offline queue → later sync. Reorder brings cached previous-order items into the active cart, then opens that same editable checkout. Do not directly submit a reorder or create a parallel checkout shortcut.

**Offline flow:** cache-first catalog/image fallback; per-customer Recent Orders and Balance Sheet caches; bounded image warm-up; SQLite queue and WorkManager for background sync. Android Force Stop is a real limit.

**Historical limit:** distributor assignment changes were verified statically and with focused tests, not live backend writes; older orders were not repaired.

## HRMS mobile app (Flutter, original folder `hrms_mobileapp`)

**Code entry map:** `lib/auth_repository.dart`; `lib/dashboard_page.dart`; `lib/attendance_page.dart`; `lib/location_service.dart`; `lib/location_repository.dart`; `lib/leave_pages.dart`.

**Login and attendance flow:** login API → securely store access token and cache non-secret session data → dashboard opens without GPS. Mark Punch or Check Current Location triggers permission, location capture, reverse geocoding and geofence verification. Office coordinates/radius were not configured in the recorded work, so `unconfigured` blocks attendance. Biometric attendance was excluded.

**Historical limit:** several employee-service pages were static or demo-backed; verify endpoints before treating them as live.

## Mansoortech (Next.js/Prisma SaaS, original folder `mansoortech`)

**Start with:** `GEMINI_PROJECT_HANDOFF.md`, `GEMINI_PRODUCT_DOSSIER.md`, project `AGENTS.md`, `prisma/schema.prisma`, `lib/auth.ts`, `lib/tenant.ts`, `app/api/auth/`, `app/api/organizations/`, and `app/api/tenants/`.

**Security flow:** authenticate → resolve active organization/tenant membership → authorize server-side → scope database access and API output by tenant → audit sensitive operations. Preserve RBAC, session revocation and isolation tests. The earlier dossier flagged open branch/product decisions; never infer a completed Branch model from the summary alone.

**Historical limit:** many static and test checks passed in the recorded session, but broad live coverage was incomplete. Gateway credentials are outside the repo.

## InfoTech Solutions website and profile (Next.js, original folder `infotech-next`)

**Source map:** `lib/data.json` holds verified business content used for the profile; `scripts/build_premium_profile.py` built the PDF in the recorded work. The website's project instructions apply before any UI edit.

**Content flow:** extract the company's real service, product and contact data → design the business profile → render and inspect every PDF page. The owner required a detailed premium light PDF, real logo, no pink palette, readable full pages and no “Custom ERP” wording. No active InfoTech work is requested by this handoff.

## SAPWithSSS report UI convention

For future report pages, the approved DC Confirmation pattern is the reference: light title/filter cards, column search below header labels, sticky two-row table header, internal table scrolling and 10/25/50 Previous/Next pagination. Preserve API, database, SAP, controller and query behavior unless the owner separately asks to change them. Find the current project and implementation before applying this pattern.
