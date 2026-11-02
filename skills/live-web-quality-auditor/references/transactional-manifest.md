# Transactional test manifest

Use a checked-in, non-secret YAML or JSON file for development/staging runs.
The agent must refuse transactional mode when this file is absent, when the
environment is production, or when cleanup and request limits are missing.

```yaml
mode: transactional
environment: development
base_url: https://staging.example.test
fixture_file: fixtures/cartivo-qa.json
roles: [normal_customer, order_booker]

coverage:
  branches: [branch_001, branch_002]
  companies: [company_001]
  product_ids: [product_001, product_002]
  strategy: smoke-and-boundaries # or full-shard
  max_shards: 4

allowed_actions:
  - create_test_user
  - login
  - select_customer
  - add_to_cart
  - update_quantity
  - apply_test_price
  - create_cod_test_order
  - view_order
  - cancel_test_order

limits:
  max_users_created: 6
  max_orders_created: 12
  max_requests_per_route: 40
  max_retries: 2
  backoff_ms: 500

payment:
  provider: fake-cod
  real_payment: false
  settlement: never

cleanup:
  required: true
  endpoint_or_script: fixtures/cleanup-qa-run
  keep_artifacts: true
```

The fixture file contains IDs and safe test values, never passwords or bearer
tokens. Credentials come from the runtime secret store. Every created user,
cart, order, address, and test price must be tagged with `qa_run_id`; cleanup
must be idempotent and report what could not be removed.

## Required transactional assertions

- each role sees only its allowed UI and API actions;
- product, variant, special price, tax, shipping, discount, and total agree
  between the UI and the API response;
- repeated submit or timeout retry does not create a duplicate order;
- stock/quantity boundaries show the intended validation;
- COD remains a test state and never invokes real settlement;
- order detail, reorder, cancellation, and cleanup complete for every shard.

The final report must include manifest hash, `qa_run_id`, shard coverage,
created identifiers, cleanup status, and all blocked or skipped cases.
