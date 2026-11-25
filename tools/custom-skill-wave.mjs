#!/usr/bin/env node

export const SHARED_CUSTOM_SKILLS = Object.freeze([
  'mansoor-task-contract', 'mansoor-context-snapshot', 'mansoor-evidence-loop',
  'mansoor-parallel-handoff', 'mansoor-regression-matrix', 'mansoor-dependency-risk',
  'mansoor-failure-recovery', 'mansoor-permission-lane', 'mansoor-source-provenance',
  'mansoor-platform-adapter', 'mansoor-grounded-claims',
]);

export const DOMAIN_CUSTOM_SKILLS = Object.freeze([
  'mansoor-backend-contracts', 'mansoor-data-integrity', 'mansoor-mobile-release',
  'mansoor-ui-state-quality', 'mansoor-seo-live-audit', 'mansoor-web-performance',
  'mansoor-media-render-qa', 'mansoor-image-asset-provenance', 'mansoor-ci-failure-triage',
  'mansoor-research-synthesis', 'mansoor-security-boundary', 'mansoor-architecture-evolution',
  'mansoor-artifact-quality', 'mansoor-owner-handoff', 'mansoor-deployment-readiness',
  'mansoor-artifact-provenance', 'mansoor-release-rollback', 'mansoor-source-conflict-resolution',
  'mansoor-learning-calibration', 'mansoor-product-gap-evidence', 'mansoor-oss-repository-archaeology',
  'mansoor-antigravity-native-sync', 'mansoor-ui-component-alignment',
]);

export const CUSTOM_SKILL_IDS = Object.freeze([...SHARED_CUSTOM_SKILLS, ...DOMAIN_CUSTOM_SKILLS]);

const bundles = {
  'production-orchestrator': [...SHARED_CUSTOM_SKILLS, 'mansoor-research-synthesis', 'mansoor-architecture-evolution', 'mansoor-antigravity-native-sync'],
  'agent-hub-maintainer': [...SHARED_CUSTOM_SKILLS, 'mansoor-research-synthesis', 'mansoor-architecture-evolution', 'mansoor-antigravity-native-sync'],
  'deployment-release-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-deployment-readiness', 'mansoor-artifact-provenance', 'mansoor-release-rollback'],
  'application-security-reviewer': [...SHARED_CUSTOM_SKILLS, 'mansoor-security-boundary', 'mansoor-data-integrity'],
  'cloud-data-engineer': [...SHARED_CUSTOM_SKILLS, 'mansoor-data-integrity', 'mansoor-backend-contracts', 'mansoor-deployment-readiness'],
  'dotnet-backend-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-backend-contracts', 'mansoor-security-boundary', 'mansoor-deployment-readiness'],
  'ecommerce-ecosystem-gap-analyst': [...SHARED_CUSTOM_SKILLS, 'mansoor-research-synthesis', 'mansoor-architecture-evolution', 'mansoor-product-gap-evidence'],
  'enterprise-schema-architect': [...SHARED_CUSTOM_SKILLS, 'mansoor-data-integrity', 'mansoor-architecture-evolution'],
  'flutter-mobile-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-mobile-release', 'mansoor-ui-state-quality'],
  'github-actions-ci-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-ci-failure-triage', 'mansoor-artifact-quality', 'mansoor-deployment-readiness', 'mansoor-artifact-provenance'],
  'image-generation-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-image-asset-provenance', 'mansoor-artifact-quality'],
  'mansoor-ui-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-ui-state-quality', 'mansoor-image-asset-provenance'],
  'ui-pro-max-specialist': [...SHARED_CUSTOM_SKILLS.filter((id) => id !== 'mansoor-parallel-handoff'), 'mansoor-ui-state-quality', 'mansoor-ui-component-alignment'],
  'ml-systems-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-data-integrity', 'mansoor-backend-contracts'],
  'node-backend-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-backend-contracts', 'mansoor-security-boundary', 'mansoor-deployment-readiness', 'mansoor-artifact-provenance'],
  'open-source-commerce-researcher': [...SHARED_CUSTOM_SKILLS, 'mansoor-research-synthesis', 'mansoor-artifact-quality', 'mansoor-oss-repository-archaeology'],
  'python-backend-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-backend-contracts', 'mansoor-data-integrity'],
  'qa-release-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-seo-live-audit', 'mansoor-web-performance', 'mansoor-deployment-readiness', 'mansoor-release-rollback'],
  'research-docs-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-research-synthesis', 'mansoor-artifact-quality', 'mansoor-source-conflict-resolution'],
  'learning-mentor-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-research-synthesis', 'mansoor-artifact-quality', 'mansoor-learning-calibration'],
  'saas-architect': [...SHARED_CUSTOM_SKILLS, 'mansoor-architecture-evolution', 'mansoor-data-integrity', 'mansoor-product-gap-evidence'],
  'seo-domain-manager': [...SHARED_CUSTOM_SKILLS, 'mansoor-seo-live-audit', 'mansoor-web-performance'],
  'seo-growth-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-seo-live-audit', 'mansoor-web-performance'],
  'video-editing-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-media-render-qa', 'mansoor-artifact-quality'],
  'web-performance-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-web-performance', 'mansoor-seo-live-audit'],
  'web-audit-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-seo-live-audit', 'mansoor-web-performance'],
  'workflow-automation-specialist': [...SHARED_CUSTOM_SKILLS, 'mansoor-backend-contracts', 'mansoor-owner-handoff'],
};

export const customSkillWave = Object.freeze(bundles);
export function customSkillsForAgent(agentId) { return [...(customSkillWave[String(agentId)] || [])]; }
export function isCustomSkill(id) { return CUSTOM_SKILL_IDS.includes(String(id)); }

