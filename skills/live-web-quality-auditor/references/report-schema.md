# Report schema

Store one JSON report per run and human-readable Markdown beside it.

```json
{
  "run_id": "2026-10-19T12:00:00Z",
  "target": {"base_url": "https://example.test", "environment": "staging"},
  "provider": "antigravity-browser|playwright|codex-cua",
  "mode": "audit|transactional",
  "qa_run_id": "qa_2026_10_19_001",
  "manifest_sha256": "optional-for-transactional-runs",
  "viewports": [{"width": 360, "height": 800}],
  "flows": [{"name": "login", "status": "passed|failed|blocked|skipped"}],
  "findings": [{
    "id": "QA-001",
    "severity": "P0|P1|P2|P3",
    "category": "functional|auth|network|responsive|a11y|performance|visual",
    "title": "Short finding title",
    "route": "/login",
    "steps": ["Open /login", "Submit valid test credentials"],
    "expected": "The dashboard opens",
    "actual": "The request returns 403",
    "evidence": ["artifacts/login-network.json", "artifacts/login.png"],
    "observed_facts": ["POST /api/login returned 403 three times"],
    "inference": "Possible IP or rate-limit restriction",
    "confidence": "high|medium|low",
    "recommendation": "Compare from an allowed staging origin and inspect the rate-limit rule."
  }],
  "coverage": {
    "branches": {"tested": 0, "requested": 0},
    "products": {"tested": 0, "requested": 0},
    "flows": {"passed": 0, "attempted": 0}
  },
  "created_identifiers": [],
  "cleanup": {"status": "not-applicable|passed|partial|failed", "unremoved": []},
  "coverage_gaps": [],
  "next_run": "Rerun QA-001 after the environment is available"
}
```

Never include passwords, bearer tokens, cookies, or unredacted personal data.
