#!/usr/bin/env node

const shared = [
  'mansoor-task-contract', 'mansoor-context-snapshot', 'mansoor-evidence-loop',
  'mansoor-parallel-handoff', 'mansoor-regression-matrix', 'mansoor-dependency-risk',
  'mansoor-failure-recovery', 'mansoor-permission-lane', 'mansoor-source-provenance',
  'mansoor-platform-adapter', 'mansoor-artifact-quality', 'mansoor-owner-handoff',
];

const frontend = [
  'mansoor-premium-frontend-art-direction', 'mansoor-premium-frontend-threejs-scene-engineering',
  'mansoor-premium-frontend-shader-materials', 'mansoor-premium-frontend-scroll-storytelling',
  'mansoor-premium-frontend-css-cinematic-motion', 'mansoor-premium-frontend-view-transition-architecture',
  'mansoor-premium-frontend-interaction-physics', 'mansoor-premium-frontend-responsive-composition',
  'mansoor-premium-frontend-luxury-typography', 'mansoor-premium-frontend-asset-provenance',
  'mansoor-premium-frontend-performance-budgets', 'mansoor-premium-frontend-accessibility-visual-regression',
];

const backend = [
  'mansoor-premium-backend-threat-model', 'mansoor-premium-backend-zero-trust',
  'mansoor-premium-backend-tenant-isolation', 'mansoor-premium-backend-schema-evolution',
  'mansoor-premium-backend-migration-safety', 'mansoor-premium-backend-idempotency',
  'mansoor-premium-backend-observability', 'mansoor-premium-backend-resilience',
  'mansoor-premium-backend-supply-chain', 'mansoor-premium-backend-contract-testing',
  'mansoor-premium-backend-query-performance', 'mansoor-premium-backend-release-audit',
];

const creative = [
  'mansoor-premium-creative-art-direction', 'mansoor-premium-creative-banner-campaigns',
  'mansoor-premium-creative-image-generation', 'mansoor-premium-creative-layout-systems',
  'mansoor-premium-creative-typography-color', 'mansoor-premium-creative-asset-provenance',
  'mansoor-premium-creative-pdf-production', 'mansoor-premium-creative-ebook-publishing',
  'mansoor-premium-creative-catalog-composition', 'mansoor-premium-creative-uiux-prototyping',
  'mansoor-premium-creative-export-preflight', 'mansoor-premium-creative-visual-qa',
];

const architecture = [
  'mansoor-premium-architecture-system-mapping', 'mansoor-premium-architecture-domain-boundaries',
  'mansoor-premium-architecture-modular-tradeoffs', 'mansoor-premium-architecture-data-contracts',
  'mansoor-premium-architecture-event-consistency', 'mansoor-premium-architecture-deployment-topology',
  'mansoor-premium-architecture-scalability', 'mansoor-premium-architecture-reliability',
  'mansoor-premium-architecture-security', 'mansoor-premium-architecture-adr',
  'mansoor-premium-architecture-migration-seams', 'mansoor-premium-architecture-verification',
];

const coding = [
  'mansoor-premium-coding-codebase-recon', 'mansoor-premium-coding-plan-contracts',
  'mansoor-premium-coding-tdd-first', 'mansoor-premium-coding-type-safety',
  'mansoor-premium-coding-boundaries', 'mansoor-premium-coding-refactoring',
  'mansoor-premium-coding-debugging', 'mansoor-premium-coding-performance',
  'mansoor-premium-coding-security', 'mansoor-premium-coding-integration',
  'mansoor-premium-coding-review', 'mansoor-premium-coding-release',
];

const localModel = [
  'mansoor-premium-local-backend-probe', 'mansoor-premium-local-context-compression',
  'mansoor-premium-local-retrieval-grounding', 'mansoor-premium-local-task-decomposition',
  'mansoor-premium-local-tool-routing', 'mansoor-premium-local-structured-output',
  'mansoor-premium-local-verifier-loop', 'mansoor-premium-local-self-consistency',
  'mansoor-premium-local-memory-replay', 'mansoor-premium-local-evaluation',
  'mansoor-premium-local-resource-scheduling', 'mansoor-premium-local-fallback-policy',
];

const roles = [
  ['discovery', 'map the current implementation and evidence boundary'],
  ['architecture', 'propose the smallest compatible premium design'],
  ['implementer', 'own the bounded implementation chunk'],
  ['polish', 'apply the domain-specific premium quality pass'],
  ['performance', 'measure and reduce the dominant cost or latency'],
  ['accessibility', 'check inclusive behavior and failure states'],
  ['security', 'challenge trust boundaries and unsafe paths'],
  ['data-contract', 'verify data, API, asset or artifact contracts'],
  ['test', 'add or run focused regression evidence'],
  ['critic', 'review the work read-only for quality and scope'],
  ['release', 'prepare reproducible release evidence'],
  ['handoff', 'return a manager-ready result and stop condition'],
];

function makeRoles(domain) {
  return roles.map(([id, purpose], index) => ({
    id: `${domain}-${id}`,
    role: `${domain}-${id}-specialist`,
    purpose,
    prompt: `Act as the ${domain} ${id} bonus specialist. Work only on the assigned scope, preserve existing contracts, record observed evidence, and stop when the ${domain} acceptance boundary is verified.`,
    readOnly: ['discovery', 'architecture', 'critic', 'handoff'].includes(id),
    wave: index < 5 ? 1 : index < 10 ? 2 : 3,
  }));
}

const defaultGates = ['task-contract', 'repository-context', 'evidence-loop', 'regression-matrix', 'owner-handoff'];
const frontendGates = [...defaultGates, 'browser-rendered-evidence', 'lighthouse-final-gate', 'accessibility-and-motion-review'];
const backendGates = [...defaultGates, 'threat-model-and-negative-paths', 'contract-and-migration-checks', 'observability-and-recovery'];
const creativeGates = [...defaultGates, 'asset-provenance', 'rendered-artifact-evidence', 'export-preflight'];
const architectureGates = [...defaultGates, 'architecture-contract', 'dependency-graph', 'tradeoff-record', 'independent-design-review'];
const codingGates = [...defaultGates, 'implementation-contract', 'focused-regression', 'independent-code-review', 'release-evidence'];
const localModelGates = [...defaultGates, 'local-backend-probe', 'retrieval-grounding', 'structured-output-validation', 'independent-verifier'];

const domainSpecs = [
  ['frontend', frontend, frontendGates],
  ['backend', backend, backendGates],
  ['database', [...backend.slice(3, 12), ...shared.slice(0, 3)], backendGates],
  ['security', [...backend.slice(0, 3), ...backend.slice(6, 10), ...shared.slice(5, 8), 'mansoor-owner-handoff', 'mansoor-artifact-quality'], backendGates],
  ['architecture', architecture, architectureGates],
  ['coding', coding, codingGates],
  ['local-model', localModel, localModelGates],
  ['creative-production', creative, creativeGates],
  ['document-publishing', [creative[3], creative[4], creative[5], creative[6], creative[7], creative[9], creative[10], creative[11], 'mansoor-source-provenance', 'mansoor-evidence-loop', 'mansoor-regression-matrix', 'mansoor-owner-handoff'], creativeGates],
  ['catalog-commerce', [creative[0], creative[1], creative[2], creative[3], creative[4], creative[5], creative[8], creative[9], creative[10], creative[11], 'mansoor-data-integrity', 'mansoor-owner-handoff'], creativeGates],
  ['seo', ['mansoor-seo-live-audit', 'mansoor-web-performance', 'live-web-quality-auditor', 'live-browser-fallback-lighthouse', 'seo-engineering-workflow', 'open-source-first-development', 'mansoor-evidence-loop', 'mansoor-regression-matrix', 'mansoor-artifact-quality', 'mansoor-owner-handoff', 'web-performance-audit', 'playwright-cli-live-browser'], frontendGates],
  ['web-performance', ['mansoor-web-performance', 'live-web-quality-auditor', 'live-browser-fallback-lighthouse', 'playwright-cli-live-browser', 'chromium-browser-engineering', 'browser-regression-handoff', ...shared.slice(0, 6)], frontendGates],
  ['flutter-mobile', ['mansoor-mobile-release', 'mansoor-ui-state-quality', 'flutter-mobile-master-engineer', 'flutter-production-layout-qa', 'adaptive-layout', 'accessibility-as-code', 'flutter-performance', 'widget-golden-and-a11y-testing', ...shared.slice(0, 4)], defaultGates],
  ['ui-ux', ['mansoor-ui-state-quality', 'mansoor-premium-frontend-art-direction', 'mansoor-premium-frontend-css-cinematic-motion', 'mansoor-premium-frontend-responsive-composition', 'mansoor-premium-creative-uiux-prototyping', 'mansoor-premium-creative-layout-systems', 'frontend-design', 'impeccable', 'design-reference-research', 'web-design-guidelines', 'accessibility-as-code', 'mansoor-owner-handoff'], frontendGates],
  ['media-video', ['mansoor-media-render-qa', 'media-production-master', 'video-editing-workflow', 'video-production-qa', 'mansoor-artifact-quality', 'mansoor-source-provenance', 'mansoor-evidence-loop', 'mansoor-regression-matrix', 'mansoor-failure-recovery', 'mansoor-platform-adapter', 'mansoor-owner-handoff', 'lightweight-image-assets'], defaultGates],
  ['image-generation', ['mansoor-premium-creative-art-direction', 'mansoor-premium-creative-image-generation', 'mansoor-premium-creative-banner-campaigns', 'mansoor-premium-creative-asset-provenance', 'mansoor-premium-creative-typography-color', 'mansoor-premium-creative-export-preflight', 'mansoor-premium-creative-visual-qa', 'production-image-generation', 'mansoor-image-asset-provenance', 'mansoor-artifact-quality', 'mansoor-source-provenance', 'mansoor-owner-handoff'], creativeGates],
  ['ci-release', ['mansoor-ci-failure-triage', 'gh-fix-ci', 'ci-pipeline-and-gates', 'dependency-hygiene', 'mansoor-artifact-quality', 'mansoor-evidence-loop', 'mansoor-regression-matrix', 'mansoor-failure-recovery', 'mansoor-permission-lane', 'mansoor-platform-adapter', 'mansoor-owner-handoff', 'dotnet-release-readiness'], defaultGates],
  ['data-ml', [...backend.slice(6, 12), 'mansoor-data-integrity', 'ml-evaluation-validation', 'ml-experiment-reproducibility', 'ml-monitoring-drift', ...shared.slice(0, 2)], backendGates],
  ['workflow-automation', ['mansoor-backend-contracts', 'mansoor-failure-recovery', 'workflow-state-machines', 'workflow-durable-execution', 'workflow-idempotency', 'workflow-retries-compensation', 'workflow-human-approval-gates', 'workflow-observability', 'mansoor-data-integrity', 'mansoor-security-boundary', 'mansoor-owner-handoff', 'mansoor-regression-matrix'], backendGates],
  ['research-docs', ['mansoor-research-synthesis', 'mansoor-source-provenance', 'open-source-first-development', 'autonomous-deep-researcher', 'reverse-deep-researcher', 'workflow-source-research', 'feature-documentation', 'mansoor-context-snapshot', 'mansoor-evidence-loop', 'mansoor-regression-matrix', 'mansoor-owner-handoff', 'mansoor-artifact-quality'], defaultGates],
  ['agent-hub', ['mansoor-research-synthesis', 'mansoor-architecture-evolution', 'open-source-first-development', 'agent-hub-operations', 'skill-repair', 'project-context-orchestrator', 'isolated-feature-promotion', 'mansoor-source-provenance', 'mansoor-evidence-loop', 'mansoor-regression-matrix', 'mansoor-owner-handoff', 'mansoor-artifact-quality'], defaultGates],
];

export const PREMIUM_DOMAINS = Object.freeze(domainSpecs.map(([id, skills, requiredGates]) => ({
  id, skills: Object.freeze([...new Set(skills)]), bonusRoles: Object.freeze(makeRoles(id)), requiredGates: Object.freeze([...new Set(requiredGates)]), activationLimit: 5,
})));
export const PREMIUM_SKILL_IDS = Object.freeze([...new Set(PREMIUM_DOMAINS.flatMap((domain) => domain.skills).filter((id) => String(id).startsWith('mansoor-premium-')))]);

const GENERAL = Object.freeze({ id: 'general', skills: Object.freeze([...shared]), bonusRoles: Object.freeze(makeRoles('general')), requiredGates: Object.freeze(defaultGates), activationLimit: 5 });
const keywordDomains = [
  ['frontend', /frontend|three\.js|threejs|webgl|shader|scroll|css|react|next\.js|animation|motion/i],
  ['architecture', /architecture|system design|bounded context|modular monolith|microservice|deployment topology|migration plan|adr|domain model/i],
  ['coding', /coding agent|implementation loop|implement feature|refactor code|debug code|production code|test-first coding/i],
  ['local-model', /local model|ollama|llama\.cpp|llama-cli|vllm|local inference|offline model|model fallback/i],
  ['backend', /backend|api|server|node|python|\.net|service|auth|tenant/i],
  ['database', /database|schema|migration|postgres|sql|ledger|query/i],
  ['security', /security|threat|zero[- ]trust|permission|secret|vulnerability/i],
  ['document-publishing', /pdf|ebook|e-book|brochure|report|publication|print-ready|document layout/i],
  ['catalog-commerce', /catalog|catalogue|price book|lookbook|product grid|merchandising/i],
  ['creative-production', /banner|poster|campaign creative|creative asset|art direction|brand visual|illustration/i],
  ['seo', /seo|search visibility|schema|sitemap|robots|geo|ai search/i],
  ['web-performance', /performance|lighthouse|core web vitals|latency|bundle|rendering/i],
  ['flutter-mobile', /flutter|dart|android|mobile|widget|device/i],
  ['ui-ux', /ui|ux|design system|responsive|accessibility|visual design/i],
  ['media-video', /video|ffmpeg|caption|subtitle|audio|motion graphics/i],
  ['image-generation', /image|thumbnail|mockup|asset/i],
  ['ci-release', /github actions|ci|release|pipeline|workflow run|deployment/i],
  ['data-ml', /machine learning|ml|pytorch|model|dataset|bigquery|spark|dataflow/i],
  ['workflow-automation', /workflow|queue|retry|webhook|scheduled|orchestration/i],
  ['research-docs', /research|documentation|compare|investigate|repository/i],
  ['agent-hub', /agent hub|skill|antigravity|codex|gemini|plugin/i],
];

export function selectPremiumCapsule({ domain = '', request = '' } = {}) {
  const explicit = PREMIUM_DOMAINS.find((entry) => entry.id === String(domain).toLowerCase());
  const inferredId = explicit?.id || keywordDomains.find(([, pattern]) => pattern.test(String(request)))?.[0];
  const inferred = PREMIUM_DOMAINS.find((entry) => entry.id === inferredId) || GENERAL;
  return {
    schema: 'mansoor.premium-domain-capsule/v1', domain: inferred.id, skills: [...inferred.skills], bonusRoles: inferred.bonusRoles.map((role) => ({ ...role })), requiredGates: [...inferred.requiredGates], activationLimit: inferred.activationLimit,
    premiumStages: ['production-baseline', 'premium-polish', 'independent-verifier', 'owner-handoff'],
    stopCondition: 'Stop after the selected domain gates, premium polish and independent verification are evidenced; return blockers instead of widening scope.',
  };
}

