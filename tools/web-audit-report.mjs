#!/usr/bin/env node

const REQUIRED_GATES = ['browser', 'mobile-responsive', 'functional', 'technical-seo', 'performance', 'accessibility', 'security'];
const AUDIT_STAGES = ['preflight', 'browser-discovery', 'mobile-responsive', 'browser-smoke', 'functional', 'technical-seo', 'security', 'accessibility', 'performance', 'lighthouse', 'report'];
const MOBILE_REQUIRED_VIEWPORTS = ['360x800', '390x844', '412x915'];
const SEVERITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };
const SECRET_PATTERN = /(?:(?:password|passwd|secret|token|api[_-]?key|authorization)\s*[:=]\s*(?:Bearer\s+)?["']?[^\s"';,}]+|Bearer\s+[A-Za-z0-9._~+/=-]+)/gi;

function redact(value) { return String(value ?? '').replace(SECRET_PATTERN, '[REDACTED_SECRET]').slice(0, 6000); }

export function mergeAuditFindings(findings = []) {
  const merged = new Map();
  for (const finding of Array.isArray(findings) ? findings : []) {
    const rootCause = String(finding?.rootCause || finding?.title || 'unclassified');
    const severity = /^P[0-3]$/.test(String(finding?.severity)) ? String(finding.severity) : 'P3';
    const current = merged.get(rootCause);
    if (!current || SEVERITY_RANK[severity] < SEVERITY_RANK[current.severity]) {
      merged.set(rootCause, { ...finding, rootCause, severity, evidence: redact(finding?.evidence || '') });
    } else {
      current.routes = [...new Set([...(current.routes || []), finding?.route].filter(Boolean))];
      current.evidence = redact(`${current.evidence} ${finding?.evidence || ''}`);
    }
  }
  return [...merged.values()].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.rootCause.localeCompare(b.rootCause));
}

function buildFixPlan(findings) {
  const order = ['P0', 'P1', 'P2', 'P3'];
  const batches = order.map((priority) => ({
    id: `fix-${priority.toLowerCase()}`,
    priority,
    findingIds: findings.filter((item) => item.severity === priority).map((item) => item.id || item.rootCause),
  })).filter((batch) => batch.findingIds.length);
  return {
    schema: 'mansoor.web-audit-fix-plan/v1',
    status: findings.length ? 'proposed' : 'no-findings',
    source: 'verified-audit-findings-only',
    batches,
    items: findings.map((finding) => ({
      id: finding.id || finding.rootCause,
      priority: finding.severity,
      title: finding.title || finding.rootCause,
      routes: finding.routes || [finding.route].filter(Boolean),
      codeLocation: finding.codeLocation || null,
      evidence: finding.evidence || '',
      fixSteps: Array.isArray(finding.fixSteps) ? finding.fixSteps : [],
      suggestedPrompt: finding.suggestedPrompt || null,
      retest: finding.retest || [],
      requiresManagerReview: true,
    })),
  };
}

export function createWebAuditReport({ targetUrl, provider = 'unverified', startedAt = new Date().toISOString(), checks = [], lighthouse = null } = {}) {
  const checkMap = new Map((Array.isArray(checks) ? checks : []).map((check) => [String(check?.id || ''), { ...check, findings: mergeAuditFindings(check?.findings || []) }]));
  const gates = Object.fromEntries(REQUIRED_GATES.map((id) => {
    const check = checkMap.get(id);
    if (id !== 'mobile-responsive') return [id, { required: true, status: check?.status || 'missing' }];
    const coveredViewports = [...new Set((check?.viewports || []).map(String))];
    const missingViewports = MOBILE_REQUIRED_VIEWPORTS.filter((viewport) => !coveredViewports.includes(viewport));
    const status = !check ? 'missing' : check.status === 'pass' && missingViewports.length ? 'blocked' : check.status;
    return [id, { required: true, status, requiredViewports: MOBILE_REQUIRED_VIEWPORTS, coveredViewports, missingViewports }];
  }));
  gates.lighthouse = { required: true, status: lighthouse?.status || 'missing', score: Number.isFinite(Number(lighthouse?.score)) ? Number(lighthouse.score) : null };
  const allStatuses = Object.values(gates).map((gate) => gate.status);
  const status = allStatuses.some((value) => value === 'missing' || value === 'blocked' || value === 'skipped') ? 'blocked' : allStatuses.some((value) => value === 'fail') ? 'fail' : 'pass';
  const findings = mergeAuditFindings([...checkMap.values()].flatMap((check) => check.findings || []));
  const criticalOpen = findings.filter((finding) => finding.severity === 'P0');
  const highOpen = findings.filter((finding) => finding.severity === 'P1');
  const siteHealth = criticalOpen.length ? 'critical-findings-open' : highOpen.length ? 'high-priority-findings-open' : findings.length ? 'findings-open' : status === 'pass' ? 'no-findings-observed' : 'not-established';
  const completionLabel = status === 'blocked' ? 'Audit incomplete; required evidence or coverage is missing' : status === 'fail' ? 'Audit completed; one or more required checks failed' : findings.length ? 'Audit completed; remediation remains' : 'Audit completed; no findings observed in tested scope';
  const stageStatus = Object.fromEntries(AUDIT_STAGES.map((id) => {
    const checkId = id === 'browser-smoke' ? 'browser' : id;
    return [id, id === 'lighthouse' ? gates.lighthouse.status : checkMap.get(checkId)?.status || (id === 'report' ? 'in-progress' : 'pending')];
  }));
  const completed = Object.values(stageStatus).filter((value) => ['pass', 'fail', 'blocked', 'skipped'].includes(value)).length;
  const currentStage = AUDIT_STAGES.find((id) => ['pending', 'in-progress'].includes(stageStatus[id])) || 'complete';
  const progress = { completedStages: completed, totalStages: AUDIT_STAGES.length, percent: Math.floor(completed / AUDIT_STAGES.length * 100), currentStage, stages: AUDIT_STAGES.map((id) => ({ id, status: stageStatus[id] })) };
  const fixPlan = buildFixPlan(findings);
  const postAuditOptions = [{ id: 'plan-fixes', label: 'Create a prioritized implementation plan', requiresOwnerChoice: true }];
  if (findings.length) postAuditOptions.push({ id: 'implement-approved-fixes', label: 'Implement selected fixes after scope approval', requiresOwnerChoice: true });
  return { schema: 'mansoor.web-audit-report/v1', targetUrl: String(targetUrl || ''), provider: String(provider), startedAt, status, completionLabel, siteHealth, openFindingCounts: { P0: criticalOpen.length, P1: highOpen.length, P2: findings.filter((finding) => finding.severity === 'P2').length, P3: findings.filter((finding) => finding.severity === 'P3').length }, progress, gates, checks: [...checkMap.values()], findings, fixPlan, postAuditOptions, followUpPrompt: findings.length ? 'Would you like Mansoor AI Team Manager to create the prioritized fix plan, or should it implement selected fixes after you approve their scope?' : null, finalLighthouseRequired: true };
}

