#!/usr/bin/env node
import path from 'node:path';
import { selectPremiumCapsule } from './premium-domain-capsules.mjs';
import { detectLearningIntent } from './learning-mentor-router.mjs';
import { isTurboAutonomy, resolveParallelCapacity } from './ultra-agent-v3/concurrency.mjs';

const ROUTES = Object.freeze([
  { id: 'product-systems', pattern: /\b(inventory (?:system|erp|management)|inventory platform|warehouse management|stock management|super[- ]admin|product flows?|user journeys?|flow gaps?|erp system|commerce platform|e-commerce ecosystem)\b/i, specialists: ['ecommerce-ecosystem-gap-analyst'], team: ['open-source-commerce-researcher', 'saas-architect', 'enterprise-schema-architect', 'ui-pro-max-specialist', 'mansoor-ui-specialist', 'application-security-reviewer', 'research-docs-specialist', 'qa-release-specialist'], capabilities: ['as-is-to-be-flow-map', 'role-journey-matrix', 'workflow-gap-prediction', 'tenant-rbac-review', 'open-source-fit-and-license', 'architecture-and-docs', 'acceptance-test-matrix'], workstreams: [
    { id: 'ecommerce-ecosystem-gap-map', role: 'ecommerce-ecosystem-gap-analyst', scope: 'Reverse-engineer the existing e-commerce system and map end-to-end actors, modules, data, permissions, integrations, exceptions and prioritized gaps.', acceptanceChecks: ['as-is-to-be-flow-map', 'role-journey-matrix', 'workflow-gap-prediction', 'evidence-backed-gap-register'] },
    { id: 'open-source-commerce-benchmark', role: 'open-source-commerce-researcher', scope: 'Verify relevant Medusa, ERPNext/Frappe and adjacent open-source flows, versions, source paths, maintenance and licenses; return adaptable patterns and incompatibilities.', acceptanceChecks: ['official-versioned-references', 'license-provenance', 'deep-source-map', 'reuse-adapt-inspire-custom-decision'] },
    { id: 'saas-boundary-review', role: 'saas-architect', scope: 'Independently map the current system boundary, tenant/org/branch model, module ownership, dependencies and migration approach.', acceptanceChecks: ['tenancy-boundaries', 'domain-ownership', 'migration-sequence'] },
    { id: 'inventory-data-review', role: 'enterprise-schema-architect', scope: 'Review inventory entities, stock transitions, valuation, idempotency, concurrency and ledger invariants.', acceptanceChecks: ['inventory-state-invariants', 'ledger-integrity', 'migration-boundaries'], dependsOn: ['ecommerce-ecosystem-gap-map'] },
    { id: 'super-admin-ui-implementation', role: 'ui-pro-max-specialist', scope: 'Own the super-admin UI implementation contract: shared controls, table/form alignment, role-based journeys, responsive states, accessibility and rendered verification.', acceptanceChecks: ['role-specific-navigation', 'consistent-control-geometry', 'responsive-admin-flows', 'loading-empty-error-denied-states'], dependsOn: ['ecommerce-ecosystem-gap-map'] },
    { id: 'super-admin-ux-review', role: 'mansoor-ui-specialist', scope: 'Independently review the new super-admin UI for design-system coherence, interaction clarity and product fit after the implementation handoff.', acceptanceChecks: ['independent-ui-review', 'design-system-coherence', 'responsive-admin-flows'], dependsOn: ['super-admin-ui-implementation'] },
    { id: 'authorization-threat-review', role: 'application-security-reviewer', scope: 'Review tenant isolation, super-admin authority, delegation, impersonation, auditability and negative access paths.', acceptanceChecks: ['tenant-isolation', 'least-privilege', 'negative-authorization-tests'], dependsOn: ['ecommerce-ecosystem-gap-map'] },
    { id: 'reference-and-docs-review', role: 'research-docs-specialist', scope: 'Turn the verified source comparison and observed product gaps into traceable documentation requirements.', acceptanceChecks: ['versioned-references', 'source-provenance', 'traceable-product-documentation'], dependsOn: ['ecommerce-ecosystem-gap-map', 'open-source-commerce-benchmark'] },
    { id: 'ecosystem-acceptance-review', role: 'qa-release-specialist', scope: 'Challenge coverage and convert prioritized product gaps into role-based happy-path, negative-path and regression acceptance coverage.', acceptanceChecks: ['role-journey-coverage', 'negative-path-matrix', 'regression-acceptance'], dependsOn: ['saas-boundary-review', 'inventory-data-review', 'super-admin-ux-review', 'authorization-threat-review', 'reference-and-docs-review'] },
  ] },
  { id: 'deployment', pattern: /\b(deploy(?:ment)?|release readiness|production release|rollout|rollback|roll back|canary release|blue[- ]green|helm upgrade|container release|infrastructure rollout)\b/i, specialists: ['deployment-release-specialist'], team: ['github-actions-ci-specialist', 'application-security-reviewer', 'cloud-data-engineer', 'qa-release-specialist'], capabilities: ['platform-detection', 'artifact-provenance', 'environment-parity', 'production-preflight', 'health-gates', 'rollback-evidence'], workstreams: [
    { id: 'deployment-surface-discovery', role: 'deployment-release-specialist', scope: 'Identify the repository’s actual build, hosting, environment and rollout model; return a deployment preflight with unknowns and approval boundaries.', acceptanceChecks: ['observed-platform-and-release-path', 'target-environment-fields', 'explicit-unknowns-and-blockers'] },
    { id: 'deployment-artifact-review', role: 'github-actions-ci-specialist', scope: 'Trace the tested build to the exact deployable artifact and inspect CI provenance, pinned actions and release gates.', acceptanceChecks: ['source-revision-to-artifact-trace', 'build-and-test-evidence', 'artifact-digest-or-blocker'] },
    { id: 'deployment-security-review', role: 'application-security-reviewer', scope: 'Review deployment identity, secret references, privilege boundaries and exposure risks without revealing secret values.', acceptanceChecks: ['least-privilege-deploy-identity', 'secret-reference-only', 'security-blockers'] },
    { id: 'deployment-platform-review', role: 'cloud-data-engineer', scope: 'Verify runtime/environment parity, infrastructure dependencies, data migration ordering and rollback compatibility from repository and platform evidence.', acceptanceChecks: ['environment-parity', 'migration-compatibility', 'health-and-rollback-dependencies'], dependsOn: ['deployment-surface-discovery'] },
    { id: 'deployment-acceptance-review', role: 'qa-release-specialist', scope: 'Define pre/post-deploy smoke checks, health thresholds, rollback triggers and evidence needed to call the release successful.', acceptanceChecks: ['pre-and-post-deploy-checks', 'rollback-trigger-and-proof', 'not-run-states-preserved'], dependsOn: ['deployment-surface-discovery', 'deployment-artifact-review', 'deployment-security-review', 'deployment-platform-review'] },
  ] },
  { id: 'open-source', pattern: /\b(open[- ]source|github repo|repository|reuse|re-use|reverse engineer|reverse-engineering|inspiration|inspired by|existing implementation|medusa|erpnext|frappe|orangehrm|odoo)\b/i, specialists: ['research-docs-specialist', 'agent-hub-maintainer'], capabilities: ['oss-discovery', 'license-provenance', 'reverse-engineering', 'source-map'] },
  { id: 'github-ci', pattern: /\b(github actions?|ci|workflow run|failing checks?|pull request checks?|gh run|build pipeline)\b/i, specialists: ['github-actions-ci-specialist'], capabilities: ['gh-auth', 'bounded-action-logs', 'ci-gates'] },
  { id: 'seo-browser', pattern: /\b(seo|search visibility|metadata|schema|sitemap|robots|geo|ai search|lighthouse|browser audit|technical audit|website audit|live audit|crawl audit|mobile responsiveness|responsive audit)\b/i, specialists: ['web-audit-specialist', 'seo-domain-manager', 'qa-release-specialist'], capabilities: ['live-browser', 'mobile-first', 'lighthouse-final-gate', 'technical-seo', 'accessibility', 'security-headers'] },
  { id: 'performance', pattern: /\b(performance|core web vitals|lighthouse|slow|latency|profiling|bundle|rendering)\b/i, specialists: ['web-performance-specialist', 'qa-release-specialist'], capabilities: ['trace-or-lighthouse', 'regression-check'] },
  { id: 'media', pattern: /\b(video|ffmpeg|caption|subtitle|motion graphics|image|thumbnail|banner|visual asset|render)\b/i, specialists: ['video-editing-specialist', 'image-generation-specialist', 'qa-release-specialist'], capabilities: ['proxy-first', 'output-inspection', 'media-qa'] },
  { id: 'security', pattern: /\b(security|auth|authorization|tenant|secret|integrity|threat|permission)\b/i, specialists: ['application-security-reviewer', 'qa-release-specialist'], capabilities: ['negative-paths', 'permission-boundary', 'independent-review'] },
  { id: 'flutter', pattern: /\b(flutter|dart|android|mobile|widget|layout overflow)\b/i, specialists: ['flutter-mobile-specialist', 'qa-release-specialist'], capabilities: ['device-aware-qa', 'static-analysis', 'release-gates'] },
  { id: 'dotnet', pattern: /\b(\.net|dotnet|asp\.net|c#|razor|entity framework)\b/i, specialists: ['dotnet-backend-specialist', 'qa-release-specialist'], capabilities: ['api-contracts', 'security-review', 'ci-gates'] },
  { id: 'node', pattern: /\b(node\.js|typescript|javascript|next\.js|express|npm|pnpm)\b/i, specialists: ['node-backend-specialist', 'qa-release-specialist'], capabilities: ['typecheck', 'dependency-hygiene', 'runtime-verification'] },
  { id: 'python', pattern: /\b(python|django|fastapi|flask|pytest)\b/i, specialists: ['python-backend-specialist', 'qa-release-specialist'], capabilities: ['pytest', 'dependency-hygiene', 'runtime-verification'] },
  { id: 'workflow', pattern: /\b(workflow|queue|retry|webhook|scheduled|approval|state machine|orchestration)\b/i, specialists: ['workflow-automation-specialist', 'qa-release-specialist'], capabilities: ['failure-matrix', 'idempotency', 'recovery'] },
  { id: 'architecture', pattern: /\b(architecture|migration|schema|database|multi-tenant|saas|design)\b/i, specialists: ['saas-architect', 'enterprise-schema-architect', 'qa-release-specialist'], capabilities: ['contract-first', 'dependency-graph', 'rollback-plan'] },
]);

function unique(values) { return [...new Set(values.map(String).filter(Boolean))]; }

export function routePremiumRequest({ request = '', files = [], changedPaths = [], risk = 'low', autonomy = '', maxParallel } = {}) {
  const corpus = `${request} ${files.join(' ')} ${changedPaths.join(' ')}`;
  const learning = detectLearningIntent({ request, files });
  const matches = ROUTES.filter((route) => route.pattern.test(corpus));
  const selectedRoutes = learning.matched
    ? [{ id: 'learning-mentor', specialists: ['learning-mentor-specialist'], capabilities: ['topic-lock', 'targeted-research', 'layered-teaching', 'teach-back-check'] }, ...matches.slice(0, 2)]
    : (matches.length ? matches.slice(0, 3) : [{ id: 'general-engineering', specialists: ['production-orchestrator'], capabilities: ['reverse-engineering', 'targeted-verification'] }]);
  const consolidatedRoutes = selectedRoutes.some((route) => route.id === 'product-systems')
    ? selectedRoutes.filter((route) => route.id === 'product-systems' || !['open-source', 'architecture'].includes(route.id))
    : selectedRoutes;
  const primarySpecialists = consolidatedRoutes.map((route) => route.specialists[0]);
  const specialists = unique([...primarySpecialists, ...consolidatedRoutes.flatMap((route) => route.team || []), ...(consolidatedRoutes.length > 1 ? ['qa-release-specialist'] : [])]).slice(0, 10);
  const ownedPaths = unique([...changedPaths, ...files]).filter((entry) => !/\.(md|txt)$/i.test(entry));
  const workItemCandidates = consolidatedRoutes.flatMap((route) => (route.workstreams || [{ id: `${route.id}-audit`, role: route.specialists[0], scope: `Inspect ${route.id} concerns in the requested project scope.`, acceptanceChecks: route.capabilities.map((capability) => `observe:${capability}`) }]).map((stream) => ({
    id: stream.id,
    role: stream.role,
    scope: stream.scope,
    deliverable: 'Evidence-backed findings and scoped implementation recommendation.',
    readOnly: true,
    ownedPaths,
    dependsOn: stream.dependsOn || [],
    acceptanceChecks: stream.acceptanceChecks,
    stopCondition: 'Stop when the route scope and evidence boundary are documented.',
  })));
  const seenWorkstreamRoles = new Set();
  const workItems = workItemCandidates.filter((item) => {
    if (seenWorkstreamRoles.has(item.role)) return false;
    seenWorkstreamRoles.add(item.role);
    return true;
  });
  if (workItems.length > 1 && !consolidatedRoutes.some((route) => (route.team || []).includes('qa-release-specialist'))) workItems.push({
    id: 'premium-independent-verifier',
    role: 'qa-release-specialist',
    scope: 'Verify merged findings and acceptance evidence without changing source files.',
    deliverable: 'Independent verification result with gaps and regression risks.',
    readOnly: true,
    ownedPaths,
    dependsOn: workItems.map((item) => item.id),
    acceptanceChecks: ['result-contract', 'scope-complete', 'no-unverified-pass-claim'],
    stopCondition: 'Stop after one integrated verification pass and bounded gap report.',
  });
  return {
    schema: 'mansoor.premium-agent-route/v1',
    risk: String(risk || 'low'),
    matchedDomains: consolidatedRoutes.map((route) => route.id),
    recommendedSpecialists: specialists,
    suggestedWorkItems: workItems,
    requiredCapabilities: unique(consolidatedRoutes.flatMap((route) => route.capabilities)),
    learning: learning.matched ? { mode: learning.mode, topic: learning.topic, answerPolicy: 'research-before-answer; topic-mismatch-blocks-output' } : null,
    openSourceGate: consolidatedRoutes.some((route) => route.id === 'open-source' || route.id === 'product-systems') ? 'required-before-implementation' : 'not-triggered',
    premiumCapsule: /\b(premium|cinematic|three\.js|threejs|webgl|shader|scroll[- ]driven|next[- ]scale|production[- ]grade|harden|luxury|architecture|system design|modular monolith|microservice|domain model|migration plan|coding agent|implementation loop|implement feature|refactor code|debug code|test-first coding|local model|ollama|llama\.cpp|llama-cli|vllm|local inference|offline model|model fallback)\b/i.test(corpus)
      ? selectPremiumCapsule({ request: corpus }) : null,
    maxParallelWorkers: resolveParallelCapacity({
      requested: maxParallel || (isTurboAutonomy(autonomy) ? undefined : workItems.filter((item) => !item.dependsOn.length).length || 1),
      autonomy,
      parallelRequested: workItems.length > 1,
    }),
    fallback: matches.length || learning.matched ? null : 'general-engineering-route',
  };
}

if (process.argv[1] && path.basename(process.argv[1]) === 'premium-agent-router.mjs') {
  const args = process.argv.slice(2);
  const value = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] || '' : ''; };
  const parseList = (name) => value(name).split(',').map((entry) => entry.trim()).filter(Boolean);
  process.stdout.write(`${JSON.stringify(routePremiumRequest({ request: value('--request'), files: parseList('--files'), changedPaths: parseList('--changed-paths'), risk: value('--risk') || 'low' }), null, 2)}\n`);
}
