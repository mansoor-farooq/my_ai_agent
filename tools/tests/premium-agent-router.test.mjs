import test from 'node:test';
import assert from 'node:assert/strict';
import { routePremiumRequest } from '../premium-agent-router.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('routes open-source requests through the OSS gate before implementation', () => {
  const result = routePremiumRequest({ request: 'Use open-source GitHub repositories and reverse engineer an ERPNext HRMS flow' });
  assert.ok(result.matchedDomains.includes('open-source'));
  assert.equal(result.openSourceGate, 'required-before-implementation');
  assert.ok(result.requiredCapabilities.includes('license-provenance'));
  assert.ok(result.suggestedWorkItems.some((item) => item.id === 'open-source-audit' && item.readOnly === true));
});

test('routes deployment work through a dedicated owner plus existing CI, security, cloud and QA peers', () => {
  const result = routePremiumRequest({ request: 'Plan a safe production deployment and rollback for this service' });
  assert.ok(result.matchedDomains.includes('deployment'));
  for (const specialist of ['deployment-release-specialist', 'github-actions-ci-specialist', 'application-security-reviewer', 'cloud-data-engineer', 'qa-release-specialist']) {
    assert.ok(result.recommendedSpecialists.includes(specialist), `deployment route must add ${specialist}`);
  }
  for (const workstream of ['deployment-surface-discovery', 'deployment-artifact-review', 'deployment-security-review', 'deployment-platform-review', 'deployment-acceptance-review']) {
    assert.ok(result.suggestedWorkItems.some((item) => item.id === workstream), `missing ${workstream}`);
  }
  assert.equal(result.maxParallelWorkers, 3);
  assert.ok(result.suggestedWorkItems.every((item) => item.readOnly), 'deployment preflight stays read-only');
});

test('Turbo routing raises the bounded independent-worker ceiling without changing the route roster', () => {
  const result = routePremiumRequest({
    request: 'Run independent deployment, security and rollback checks in parallel',
    autonomy: 'turbo-autonomous',
  });
  assert.equal(result.maxParallelWorkers, 20);
  assert.ok(result.recommendedSpecialists.includes('deployment-release-specialist'));
});

test('keeps the existing GitHub CI route when a request covers both CI and deployment', () => {
  const result = routePremiumRequest({ request: 'Review GitHub Actions CI/CD deployment and rollback readiness' });
  assert.ok(result.matchedDomains.includes('github-ci'));
  assert.ok(result.matchedDomains.includes('deployment'));
  assert.ok(result.recommendedSpecialists.includes('github-actions-ci-specialist'));
  assert.ok(result.recommendedSpecialists.includes('deployment-release-specialist'));
});

test('deployment addition preserves the existing domain routes', () => {
  const cases = [
    ['Use open-source GitHub repos for this', 'open-source'],
    ['Review GitHub Actions CI', 'github-ci'],
    ['Run a live SEO website audit', 'seo-browser'],
    ['Profile Core Web Vitals performance', 'performance'],
    ['Edit this video render', 'media'],
    ['Review application security', 'security'],
    ['Fix this Flutter layout', 'flutter'],
    ['Fix this ASP.NET Core API', 'dotnet'],
    ['Fix this Node.js service', 'node'],
    ['Fix this Python service', 'python'],
    ['Repair a webhook workflow', 'workflow'],
    ['Design a SaaS architecture', 'architecture'],
  ];
  for (const [request, expectedDomain] of cases) {
    const result = routePremiumRequest({ request });
    assert.ok(result.matchedDomains.includes(expectedDomain), `existing route ${expectedDomain} must remain available`);
  }
});

test('does not add OSS discovery to an unrelated bounded task', () => {
  const result = routePremiumRequest({ request: 'Fix a local button label' });
  assert.equal(result.openSourceGate, 'not-triggered');
  assert.equal(result.matchedDomains.includes('open-source'), false);
});

test('routes cinematic frontend work through the premium domain capsule', () => {
  const result = routePremiumRequest({ request: 'Build a premium Three.js scroll-driven product experience with luxury motion' });
  assert.equal(result.premiumCapsule.domain, 'frontend');
  assert.equal(result.premiumCapsule.skills.length, 12);
  assert.ok(result.premiumCapsule.bonusRoles.length === 12);
  assert.ok(result.premiumCapsule.requiredGates.includes('lighthouse-final-gate'));
});

test('routes production-grade database hardening through the backend/database premium lane', () => {
  const result = routePremiumRequest({ request: 'Production-grade database migration and multi-tenant API hardening' });
  assert.ok(['backend', 'database'].includes(result.premiumCapsule.domain));
  assert.equal(result.premiumCapsule.skills.length, 12);
  assert.ok(result.premiumCapsule.requiredGates.includes('threat-model-and-negative-paths'));
});

test('routes exact-topic learning requests to the learning mentor before engineering work', () => {
  const result = routePremiumRequest({ request: 'mujhe socks ke bare mein deep dive karke samjhao, sauce nahi' });
  assert.equal(result.matchedDomains[0], 'learning-mentor');
  assert.equal(result.recommendedSpecialists[0], 'learning-mentor-specialist');
  assert.equal(result.learning.answerPolicy, 'research-before-answer; topic-mismatch-blocks-output');
  assert.ok(result.requiredCapabilities.includes('topic-lock'));
});

test('routes mobile-first live website audits through the dedicated audit specialist', () => {
  const result = routePremiumRequest({ request: 'Do a full live website audit focused on mobile responsiveness' });
  assert.equal(result.recommendedSpecialists[0], 'web-audit-specialist');
  assert.ok(result.requiredCapabilities.includes('mobile-first'));
});

test('routes ERP and inventory product-system upgrades through the cross-domain product team', () => {
  const result = routePremiumRequest({ request: 'Upgrade my inventory ERP like Medusa and ERPNext; audit super-admin flows, permissions, architecture and missing user journeys, then document and verify the system' });
  assert.ok(result.matchedDomains.includes('product-systems'));
  assert.ok(result.recommendedSpecialists.includes('ecommerce-ecosystem-gap-analyst'));
  assert.ok(result.recommendedSpecialists.includes('open-source-commerce-researcher'));
  for (const specialist of ['saas-architect', 'enterprise-schema-architect', 'ui-pro-max-specialist', 'mansoor-ui-specialist', 'application-security-reviewer', 'research-docs-specialist', 'qa-release-specialist']) {
    assert.ok(result.recommendedSpecialists.includes(specialist), `full ecosystem route must include ${specialist}`);
  }
  assert.ok(result.suggestedWorkItems.some((item) => item.id === 'ecommerce-ecosystem-gap-map' && item.readOnly));
  assert.ok(result.suggestedWorkItems.some((item) => item.id === 'open-source-commerce-benchmark' && item.readOnly));
  assert.ok(result.suggestedWorkItems.some((item) => item.id === 'inventory-data-review' && item.role === 'enterprise-schema-architect'));
  assert.ok(result.suggestedWorkItems.some((item) => item.id === 'authorization-threat-review' && item.role === 'application-security-reviewer'));
  assert.ok(result.suggestedWorkItems.some((item) => item.id === 'ecosystem-acceptance-review' && item.role === 'qa-release-specialist'));
  assert.equal(result.maxParallelWorkers, 3, 'manager should run bounded, staged waves');
  assert.ok(result.requiredCapabilities.includes('role-journey-matrix'));
  assert.equal(result.openSourceGate, 'required-before-implementation');
});

test('product-system team preserves one manager and routes distinct evidence workstreams', async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const skill = await fs.readFile(path.join(root, 'skills', 'enterprise-product-systems-review', 'SKILL.md'), 'utf8');
  const manager = await fs.readFile(path.join(root, 'agents', 'Antigravity', 'custom-agents', 'production-orchestrator', 'agent.md'), 'utf8');
  for (const term of ['current product first', 'license', 'actor', 'acceptance', 'ledger', 'negative']) assert.ok(skill.toLowerCase().includes(term), `missing product review rule: ${term}`);
  assert.match(manager, /ecommerce-ecosystem-gap-analyst/);
  assert.match(manager, /Mansoor AI Team Manager/);
});
