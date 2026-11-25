---
name: audit-report-evidence
description: Use when turning browser, SEO, performance, accessibility, security and network observations into a deduplicated severity-ranked technical audit report.
---
# Audit report and evidence
Use the `mansoor.web-audit-report/v1` contract. Every finding needs URL/template, viewport, expected/actual, severity, confidence, evidence path, likely cause, recommendation, implementation status and retest state. When repository source is available, attach only verified file/line references; otherwise label code location unavailable. Include safe fix steps, a scoped prompt, dependencies and a prioritized manager handoff. After the report, offer the owner a choice to create a fix plan or implement selected fixes after scope approval. Merge duplicate root causes; preserve conflicting evidence. Mobile-responsive evidence and final Lighthouse are required gates; a missing required gate blocks a pass.

Keep `status` (whether audit coverage/gates completed) separate from `siteHealth` (whether findings remain). Any open P0/P1 must be prominent in `openFindingCounts`; never call the site healthy or clean while they remain. Proposed test cases must be labeled proposed; count tests as executed only when route, environment, timestamp, result and evidence artifact/output exist. Label the basis of each claim (browser, HTTP, source, tool or supplied evidence). Separate confirmed findings from hypotheses; unverified security concerns cannot be presented as confirmed vulnerabilities. Do not predict post-fix scores, ranking or conversion changes.

For ecommerce checkout, use staging or a test fixture. Do not place real orders, charge payment methods, mutate production data or reuse customer sessions. Capture browser console and network evidence for executed journeys. Lighthouse lab data is not field Core Web Vitals; state measurement conditions and sample count.

Stop condition: report status is pass, fail or blocked with coverage gaps and next regression run stated.
