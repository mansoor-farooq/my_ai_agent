import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebAuditReport, mergeAuditFindings } from '../web-audit-report.mjs';

test('audit cannot pass until the final Lighthouse gate is recorded', () => {
  const report = createWebAuditReport({ targetUrl: 'https://example.test', checks: [{ id: 'browser', status: 'pass' }, { id: 'functional', status: 'pass' }, { id: 'technical-seo', status: 'pass' }, { id: 'performance', status: 'pass' }, { id: 'accessibility', status: 'pass' }, { id: 'security', status: 'pass' }] });
  assert.equal(report.status, 'blocked');
  assert.equal(report.gates.lighthouse.required, true);
  assert.equal(report.gates.lighthouse.status, 'missing');
});

test('audit reports evidence-backed failures and redacts secrets', () => {
  const report = createWebAuditReport({ targetUrl: 'https://example.test', checks: [{ id: 'browser', status: 'pass' }, { id: 'mobile-responsive', status: 'pass', viewports: ['360x800', '390x844', '412x915'] }, { id: 'functional', status: 'pass' }, { id: 'technical-seo', status: 'fail', findings: [{ severity: 'P1', title: 'Missing canonical', evidence: 'Authorization: Bearer secret-token' }] }, { id: 'performance', status: 'pass' }, { id: 'accessibility', status: 'pass' }, { id: 'security', status: 'pass' }], lighthouse: { status: 'pass', score: 0.91 } });
  assert.equal(report.status, 'fail');
  assert.match(report.findings[0].evidence, /REDACTED_SECRET/);
  assert.doesNotMatch(report.findings[0].evidence, /secret-token/);
});

test('audit completion never implies the site is healthy while critical findings remain open', () => {
  const report = createWebAuditReport({
    targetUrl: 'https://example.test',
    checks: [
      { id: 'browser', status: 'pass' },
      { id: 'mobile-responsive', status: 'pass', viewports: ['360x800', '390x844', '412x915'] },
      { id: 'functional', status: 'pass' }, { id: 'technical-seo', status: 'pass' },
      { id: 'performance', status: 'pass' }, { id: 'accessibility', status: 'pass' },
      { id: 'security', status: 'pass', findings: [{ severity: 'P0', title: 'Verified public admin endpoint', evidence: 'Unauthenticated request returned admin data' }] },
    ],
    lighthouse: { status: 'pass', score: 0.92 },
  });
  assert.equal(report.status, 'pass', 'coverage and required audit gates can complete');
  assert.equal(report.siteHealth, 'critical-findings-open');
  assert.equal(report.openFindingCounts.P0, 1);
  assert.equal(report.completionLabel, 'Audit completed; remediation remains');
});

test('audit report labels untested scope as not established and never predicts post-fix scores', () => {
  const report = createWebAuditReport({ targetUrl: 'https://example.test' });
  assert.equal(report.siteHealth, 'not-established');
  assert.equal(report.completionLabel, 'Audit incomplete; required evidence or coverage is missing');
  assert.equal(Object.hasOwn(report, 'predictedScore'), false);
});

test('audit report exposes detailed stage progress and stays blocked for missing stage evidence', () => {
  const report = createWebAuditReport({ targetUrl: 'https://example.test', checks: [{ id: 'preflight', status: 'pass' }, { id: 'browser-discovery', status: 'pass' }, { id: 'browser', status: 'pass' }, { id: 'functional', status: 'pass' }] });
  assert.equal(report.status, 'blocked');
  assert.equal(report.progress.totalStages, 11);
  assert.equal(report.progress.currentStage, 'mobile-responsive');
  assert.ok(report.progress.percent > 0 && report.progress.percent < 100);
});

test('audit requires mobile responsiveness evidence and returns manager-ready fix choices', () => {
  const report = createWebAuditReport({
    targetUrl: 'https://example.test',
    checks: [
      { id: 'browser', status: 'pass' }, { id: 'functional', status: 'pass' },
      { id: 'technical-seo', status: 'pass' }, { id: 'performance', status: 'pass' },
      { id: 'accessibility', status: 'pass' }, { id: 'security', status: 'pass' },
      { id: 'mobile-responsive', status: 'fail', viewports: ['360x800', '390x844'], findings: [{ id: 'mobile-nav-overflow', rootCause: 'mobile-nav-overflow', severity: 'P1', route: '/', evidence: 'horizontal scroll on 360px', codeLocation: { path: 'src/nav.css', line: 42 }, fixSteps: ['Allow nav items to wrap below 400px'], suggestedPrompt: 'Fix mobile nav overflow at 360px and verify 390px too.' }] },
    ], lighthouse: { status: 'pass', score: 0.9 },
  });
  assert.equal(report.status, 'fail');
  assert.equal(report.gates['mobile-responsive'].required, true);
  assert.equal(report.findings[0].codeLocation.path, 'src/nav.css');
  assert.ok(report.fixPlan.batches.some((batch) => batch.findingIds.includes('mobile-nav-overflow')));
  assert.ok(report.postAuditOptions.some((option) => option.id === 'plan-fixes'));
  assert.ok(report.postAuditOptions.some((option) => option.id === 'implement-approved-fixes'));
});

test('mobile gate blocks a pass when one required phone viewport lacks evidence', () => {
  const report = createWebAuditReport({ targetUrl: 'https://example.test', checks: [{ id: 'mobile-responsive', status: 'pass', viewports: ['360x800', '390x844'] }] });
  assert.equal(report.gates['mobile-responsive'].status, 'blocked');
  assert.deepEqual(report.gates['mobile-responsive'].missingViewports, ['412x915']);
});

test('findings merge by root cause and retain the highest severity', () => {
  const merged = mergeAuditFindings([{ rootCause: 'missing-canonical', severity: 'P3', route: '/' }, { rootCause: 'missing-canonical', severity: 'P1', route: '/products' }, { rootCause: 'slow-image', severity: 'P2', route: '/' }]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((item) => item.rootCause === 'missing-canonical').severity, 'P1');
});
