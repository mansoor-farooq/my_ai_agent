# Secure Agent Release and Youngs Bazar Catalog Design

## Intent

Ship a new owner-ready Ultra Agent release and a safer Youngs Bazar Flutter catalog experience without changing existing cart, authentication, checkout, route, ID, database, or API business contracts.

The release should make first-run setup practical: the owner enters a PostgreSQL/RAG password once in a masked terminal prompt, the setup verifies the local database and stores only a protected local reference, then bootstraps the RAG schema and runs doctor checks. The mobile app should mirror the public Youngs Bazar storefront's category order and product presentation while treating the product API as the source of truth.

## Goals

- Create a signed, reproducible agent release with one-command setup and a clear doctor report.
- Use masked terminal input; never print or commit passwords, bearer keys, `.env` values, or private keys.
- Connect local PostgreSQL/RAG automatically after setup, with explicit health and migration checks.
- Normalize category/product responses from direct products and nested subcategories without inventing missing data.
- Preserve API-provided category order, product order, active status, price, and stock/availability when present.
- Diagnose missing Honey subcategory/products with an evidence report and fixture tests.
- Improve splash, category-detail, product-detail, loading, empty, out-of-stock, and error states for small Android screens.
- Produce a new debug APK and owner-signed portable ZIP after verification.

## Non-goals and anti-goals

- No dark-web research, provider bypass, credential rotation, account switching, or secret exfiltration.
- No broad rewrite of the agent hub, Flutter navigation, API clients, cart, auth, checkout, or storage keys.
- No remote banner fetch at app runtime; public visual assets remain bundled locally when used.
- No guessed Honey products or fake stock/price values when the API omits them.
- No raw password persistence in source, logs, command history, ZIPs, or tracked project files.

## Approaches considered

1. Quick UI/parser patch: fastest, but leaves first-run setup and release reliability unchanged.
2. Contract-first release (chosen): secure setup + RAG bootstrap + catalog normalization + focused UI and verification. This addresses the root causes while preserving existing flows.
3. Full v5 rewrite: unnecessary risk and conflicts with the preserve-existing-flow requirement.

## Design

### Agent release and setup

- Add a masked password prompt to the Windows setup path. The prompt accepts an optional blank value when an existing protected credential is available.
- Resolve credentials through a local Windows-protected mechanism (DPAPI/Credential Manager or an equivalent OS-backed secret store). Files may contain a reference/metadata only; raw secrets are redacted from logs.
- Bootstrap the dedicated RAG database/schema, run idempotent migrations, build/status the project index, and execute the existing doctor/tests.
- Make the setup fail closed when the database is unreachable, schema is incompatible, checksum/signature validation fails, or a secret would be written to a portable artifact.
- Build the signed ZIP with a manifest, SHA-256, release notes, install script, and a post-install verification command. Existing agent IDs, skills, and manager routing remain unchanged.

### Catalog contract

- Extend the product model with explicit active and availability/stock fields while retaining raw API values for serialization.
- Parse common API variants for status, active flags, stock quantity, availability, sequence/sort order, direct products, nested subcategories, and media URLs.
- Preserve server order by default. Only use a deterministic fallback sort when the server does not provide order.
- Filter inactive categories/products from storefront rails. Render out-of-stock only when the API explicitly provides that state; otherwise do not invent a label.
- Keep product prices sourced from the product API/effective-price fields; cart/checkout continues to verify server totals.
- Add a diagnostic path that reports the category payload shape, direct-product count, subcategory count, active-product count, and omitted-field reasons without logging secrets or customer data.

### Youngs Bazar UI

- Splash: replace the blank/dot loading state with the actual static logo, restrained progress indicator, timeout/error copy, and accessible semantics.
- Home: retain the local site banner with no overlay text, show the site-style ordered category rail, remove the synthetic “All products” rail, and show active category rails only.
- Category detail: use an adaptive grid that cannot overflow at 360dp/412dp; show active product count, collection count, availability, and real thumbnails/prices.
- Product detail: improve hierarchy, image loading/error state, price/availability block, pack information, and add-to-cart affordance without changing cart behavior.
- Loading/error/empty states must be explicit and resilient to slow or unavailable APIs.

### Mobile specialist capability contract

- The reusable `flutter-mobile-specialist` is upgraded to a cross-platform mobile product specialist rather than a Flutter-only screen generator.
- Flutter track: Dart + Material 3 tokens, Cupertino-adaptive controls, slivers, image caching, responsive breakpoints and 60fps motion.
- Native Android track: Kotlin + Jetpack Compose + Material 3/Expressive, dynamic color, edge-to-edge insets, predictive back, window-size classes and adaptive navigation.
- Shared quality bar: 48dp targets, 1.3x text scale, semantics, contrast, reduced motion, loading/empty/error/offline/partial states, and no unbounded layout overflow.
- The bundled `skills/mobile-ui-ux-designer/SKILL.md` now contains the compact cross-platform rules, so the agent gets stronger platform guidance without increasing the release skill count or loading unrelated libraries.

## Verification plan

- Unit fixtures for direct products, nested subcategories, ordering, inactive products/categories, stock/availability variants, missing Honey data, and media URLs.
- Flutter checks: `flutter test --no-pub`, `flutter analyze --no-pub`, `flutter build apk --debug`.
- Device checks on the connected Android phone at splash, home, Honey category, product detail, out-of-stock (when fixture/API provides it), and offline/error states.
- Agent checks: clean setup, existing protected credential reuse, wrong password, unreachable PostgreSQL, idempotent rerun, secret redaction, RAG health/index status, signature/checksum verification, and release ZIP contents.
- Acceptance requires no regression in cart/auth/checkout routes and no unapproved file or credential changes.

## Known unknowns

- The exact live Honey response shape and whether its two subcategories are returned by the configured endpoint must be observed through the app's API client/fixture boundary; the app will not fabricate those products.
- The API's exact stock field names and semantic values must be confirmed from observed payloads before enabling an out-of-stock label.

## Builder decisions

- Use the existing Flutter/Dart and Node/PowerShell release tooling; do not introduce a new backend or agent framework in this wave.
- Keep the current local media normalization origin and project-scoped RAG architecture.
- Treat the product API as authoritative for price and availability; server cart totals remain authoritative at checkout.
