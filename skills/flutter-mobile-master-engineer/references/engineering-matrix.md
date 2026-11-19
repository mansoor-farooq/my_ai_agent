# Flutter and Android engineering matrix

Use this as a routing aid, not as a mandate to change a project's stack.

| Work area | Reusable skill references in Mansoor AI Team Manager | Evidence to seek |
|---|---|---|
| Flutter architecture and feature boundaries | `flutter-architecture`, `project-structure-and-packages`, `flutter-apply-architecture-best-practices` | Current module graph, data ownership and dependency direction |
| State and asynchronous behavior | `state-management-riverpod`, `async-safety`, `error-handling-typed-results` | Existing state library, cancellation/lifecycle behavior, surfaced errors |
| Layout and responsive UI | `adaptive-layout`, `flutter-build-responsive-layout`, `flutter-fix-layout-issues`, `flutter-production-layout-qa` | Reproduced viewport, constraints, text scaling, keyboard and overflow result |
| UI quality and accessibility | `widget-composition`, `accessibility-as-code`, `widget-golden-and-a11y-testing`, `ui-states-and-feedback`, `i18n-rtl-l10n` | Screen states, semantics/focus, contrast, locales/RTL and supported golden coverage |
| Navigation and platform services | `navigation-and-routing`, `service-boundary-and-native`, `flutter-setup-declarative-routing` | Existing router, deep-link/back behavior, native adapter and permission fallback |
| Data, networking and code generation | `flutter-use-http-package`, `flutter-implement-json-serialization`, `persistence-drift`, `run-codegen` | Existing API/persistence conventions, generated-file ownership, retry/offline behavior |
| Tests, performance and shipping | `testing-strategy`, `flutter-performance`, `ci-pipeline-and-gates`, `release-and-store-shipping`, `flutter-add-integration-test` | Targeted regression test, measured hot path, applicable CI/release gate |

The imported skills may describe Riverpod 3, `go_router`, Drift or another canonical setup. Use those parts only when the target project already uses that tool or the user requested it. Treat framework-specific examples as version-bound and verify current package/API versions locally or in official documentation.

## Verification selection

Choose a compact set appropriate to the change:

- Dart-only logic: formatter, focused unit tests, analyzer for the affected package.
- Widget/layout: widget tests or goldens where supported, text-scale/viewport checks, and runtime screenshot/device check when available.
- Navigation, persistence, network or permission flow: focused tests plus an integration smoke for the boundary that changed.
- Native Android/plugin work: Flutter analysis/tests plus Gradle compile or device smoke for the affected variant/API level when available.
- Release work: existing release gate and artifact inspection; never substitute a successful debug build for release evidence.

Do not run every possible matrix cell for a small fix. Expand coverage when the change crosses platform, locale, device-size, lifecycle or persistence boundaries.
