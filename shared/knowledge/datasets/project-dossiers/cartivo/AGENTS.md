# Cartivo Development Rules

These rules apply to every developer and AI coding agent working in this
repository. Read `docs/README.md` before changing application behavior.

## Source of truth

- The backend catalog API is the source of truth. The client cache is a
  resilience/performance layer, never a replacement database.
- Catalog endpoint: `http://202.143.125.148:6002`.
- Authentication endpoint: `http://202.143.125.148:6002/api/auth/login` by
  default, configurable with `CARTIVO_LOGIN_ENDPOINT`.
- Media endpoint: `http://202.143.125.148:6001`. Links from port `9000`,
  `localhost`, or `127.0.0.1` must be normalized before rendering.

## Data and security

- Android/iOS use cache-first stale-while-revalidate behavior.
- Chrome/Edge use network-first catalog loading with browser-cache fallback.
- Never put passwords, tokens, API keys, or private credentials in source,
  tests, logs, screenshots, docs, or commits.
- Auth tokens use secure storage and remain separate from catalog cache data.
- Keep endpoint overrides behind `--dart-define`; do not scatter URL literals.

## Platform rules

- Web image rendering must remain CORS-safe and must not steal carousel drag
  gestures from the parent Flutter scrollable.
- iOS HTTP exceptions stay limited to the documented Cartivo hosts until HTTPS
  is available.
- Do not claim an iOS build from Windows; validate iOS plist/source here and
  build the binary on macOS.
- Windows release builds require Visual Studio Desktop C++ with ATL enabled.

## Change discipline

- Prefer focused changes with a test or a documented reason a test cannot run.
- Do not edit generated `build/` output as source.
- After a behavior or platform change, update the relevant `docs/` page and
  `planning/current-status.md`.
- Before reporting completion, run `flutter analyze --no-pub`, `flutter test`,
  and the available platform builds. Record failures and their causes.
- Keep UI text in English and developer documentation in clear English so all
  project contributors can use it.

## Automated design and architecture review

When an agent receives a UI request, route it through this checklist before
editing code:

1. **Product intent:** identify the user task, the real data behind it, and the
   smallest screen-level change that proves the behavior.
2. **Visual system:** reuse the Cartivo tokens and shared widgets; prefer a
   restrained hierarchy, meaningful motion, and responsive constraints over
  decorative effects. Every visible component must meet the premium Cartivo
  standard: intentional hierarchy, refined spacing, clear interaction states,
  and polished loading/empty/error states. Never introduce default-looking
  controls when a branded shared pattern is available. Check 360dp, 412dp,
  and 1.3x text scale.
3. **State and failure paths:** define loading, empty, error, retry, offline,
   and permission states before adding the happy-path UI.
4. **Architecture boundary:** do not invent endpoints, roles, permissions, or
   database fields. If a feature needs backend support, document the contract
   and mark the UI as blocked until the contract is verified.
5. **Validation:** run analyzer and focused tests, then inspect the affected
   screen on a real device or a matching viewport. Record visual or platform
   limitations instead of claiming coverage.

For multi-organization work, model organization membership, scoped roles,
permissions, departments, stores, inventory ownership, and audit events as
separate domain concepts. A boolean such as `is_admin` is not a substitute for
tenant scope or a permission policy. Keep hierarchy data-driven so an
organization can have several managers or deputies in one department without
hardcoded CEO/CFO chains. A global super-admin must be explicitly scoped and
audited; never infer that access from a customer or order-booker flag.
