---
name: browser-regression-handoff
description: Use after a live browser investigation when an observed web defect or critical flow should become a deterministic, maintained regression test. Use project-native fixtures and test runners; do not turn a read-only audit into code changes without explicit scope.
license: MIT
source_url: https://github.com/mansoor-farooq/my_ai_agent/tree/mansoor-development/skills/browser-regression-handoff
source_root: mansoor-agent-hub-owned
---

# Browser Regression Handoff

Turn a reproduced browser finding into a focused test contract or authorized
project test. The live browser skill establishes what happened; this skill
defines how to preserve that behavior in the project's existing test system.

## Decide the deliverable first

- If the user asked only for an audit, return a regression scenario and
  suggested path; do not edit application or test files.
- If the user asked to add/fix tests, inspect the project's existing test runner,
  test scripts, fixtures, selectors, auth setup and CI conventions before writing.
- A `run_command` tool alone is not authorization to write files. If the QA
  role has no explicit file-edit capability or manager delegation for test
  edits, report the exact test contract to the parent manager for the
  project-owning implementation specialist. Do not claim that a test was
  created.

## Convert evidence into a repeatable test

1. Start from a reproduced finding with URL/route, role, viewport, setup,
   action, expected result and actual result. Separate observed facts from
   inferred causes. If the finding did not reproduce, keep it exploratory.
2. Pick the smallest user-visible assertion that catches the defect. Use the
   project's existing framework, fixture model, naming and file placement;
   never add a second browser framework solely for this test.
3. Seed or reset state through the project's documented test fixture/API.
   Keep credentials in existing secret configuration. Do not copy browser
   cookies, local storage, personal data or captured production responses into
   the test.
4. Prefer accessible role/name and label locators, then the project's stable
   test IDs. Use CSS only when rendered evidence shows semantic locators are
   unavailable. Do not guess selectors from source markup alone.
5. Wait for a page-specific state and use retrying assertions. Avoid fixed
   sleeps, generic `networkidle` waits, timing luck, and assertions against
   implementation details that do not affect user behavior.
6. Isolate the test context; make the scenario repeatable and parallel-safe.
   Add cleanup for disposable state, deterministic time/data where needed,
   and screenshot/trace capture on failure if the project already supports it.
7. Run the exact new scenario and one adjacent smoke scenario. Run the
   project's relevant lint/build/CI check only when appropriate and report
   the exact command and result. A skipped/unavailable runner is not a pass.

## Keep the boundary clear

- An observed browser failure does not authorize writing tests, changing app
  code, creating accounts, or mutating a live backend.
- Never use real payment, production order creation, bulk data, outbound
  messages, or destructive admin actions as regression setup.
- Do not weaken assertions, hide a flaky failure, or retry until green. If
  environment state cannot be reproduced deterministically, report the
  blocker and propose a safe fixture instead.
- If the user authorizes a code change, keep edits inside the stated project
  and test scope; ask before broader data, authentication, or CI changes.

## Handoff format

Return the observed scenario, proposed/changed test path, fixture and reset
contract, commands actually run, pass/fail/blocked result, and any remaining
environment or coverage gap. Link the live evidence and regression test when
available. Never infer test success from a screenshot alone.
