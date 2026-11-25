import test from 'node:test';
import assert from 'node:assert/strict';
import { PREMIUM_DOMAINS, selectPremiumCapsule } from '../premium-domain-capsules.mjs';

test('registers twenty-one premium domains with twelve skills and roles each', () => {
  assert.equal(PREMIUM_DOMAINS.length, 21);
  for (const domain of PREMIUM_DOMAINS) {
    assert.equal(domain.skills.length, 12, `${domain.id} skill slots`);
    assert.equal(domain.bonusRoles.length, 12, `${domain.id} bonus roles`);
    assert.equal(new Set(domain.skills).size, 12);
    assert.equal(new Set(domain.bonusRoles.map((role) => role.id)).size, 12);
  }
});

test('frontend capsule requires cinematic browser, performance and accessibility evidence', () => {
  const capsule = selectPremiumCapsule({ domain: 'frontend', request: 'build a cinematic Three.js scroll story' });
  assert.equal(capsule.domain, 'frontend');
  assert.equal(capsule.activationLimit, 5);
  assert.ok(capsule.requiredGates.includes('browser-rendered-evidence'));
  assert.ok(capsule.requiredGates.includes('lighthouse-final-gate'));
  assert.ok(capsule.requiredGates.includes('accessibility-and-motion-review'));
  assert.ok(capsule.skills.some((skill) => skill.includes('three')));
});

test('architecture requests select the premium system architecture capsule', () => {
  const capsule = selectPremiumCapsule({ request: 'design a premium modular monolith architecture with migration seams' });
  assert.equal(capsule.domain, 'architecture');
  assert.equal(capsule.skills.length, 12);
  assert.ok(capsule.skills.includes('mansoor-premium-architecture-system-mapping'));
  assert.ok(capsule.skills.includes('mansoor-premium-architecture-verification'));
  assert.ok(capsule.requiredGates.includes('independent-design-review'));
});

test('coding requests select the premium implementation capsule', () => {
  const capsule = selectPremiumCapsule({ request: 'run the premium coding agent implementation loop with tests and review' });
  assert.equal(capsule.domain, 'coding');
  assert.equal(capsule.skills.length, 12);
  assert.ok(capsule.skills.includes('mansoor-premium-coding-tdd-first'));
  assert.ok(capsule.skills.includes('mansoor-premium-coding-review'));
  assert.ok(capsule.requiredGates.includes('independent-code-review'));
});

test('local-model requests select the local supercharger capsule', () => {
  const capsule = selectPremiumCapsule({ request: 'run this task with an Ollama local model and verifier fallback' });
  assert.equal(capsule.domain, 'local-model');
  assert.equal(capsule.skills.length, 12);
  assert.ok(capsule.skills.includes('mansoor-premium-local-retrieval-grounding'));
  assert.ok(capsule.requiredGates.includes('independent-verifier'));
});

test('backend capsule requires security, contract and migration evidence', () => {
  const capsule = selectPremiumCapsule({ domain: 'backend', request: 'harden a multi-tenant API and migration' });
  assert.equal(capsule.domain, 'backend');
  assert.ok(capsule.requiredGates.includes('threat-model-and-negative-paths'));
  assert.ok(capsule.requiredGates.includes('contract-and-migration-checks'));
  assert.ok(capsule.skills.some((skill) => skill.includes('threat')));
});

test('creative capsules cover banners, images, documents and catalogs with rendered evidence', () => {
  const banner = selectPremiumCapsule({ request: 'make a premium campaign banner and social variants' });
  assert.equal(banner.domain, 'creative-production');
  assert.equal(banner.skills.length, 12);
  assert.ok(banner.skills.includes('mansoor-premium-creative-banner-campaigns'));
  assert.ok(banner.requiredGates.includes('rendered-artifact-evidence'));

  const ebook = selectPremiumCapsule({ request: 'publish an accessible PDF and EPUB ebook' });
  assert.equal(ebook.domain, 'document-publishing');
  assert.ok(ebook.skills.includes('mansoor-premium-creative-pdf-production'));
  assert.ok(ebook.skills.includes('mansoor-premium-creative-ebook-publishing'));

  const catalog = selectPremiumCapsule({ request: 'compose a product catalog from SKU data' });
  assert.equal(catalog.domain, 'catalog-commerce');
  assert.ok(catalog.skills.includes('mansoor-premium-creative-catalog-composition'));
});

test('unknown domains fail closed to the manager-owned general premium capsule', () => {
  const capsule = selectPremiumCapsule({ domain: 'unknown-domain', request: 'premium task' });
  assert.equal(capsule.domain, 'general');
  assert.equal(capsule.bonusRoles.length, 12);
});
