import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const catalog = {
  node: [
    ['node-backend-architecture', /\b(architect|architecture|backend|service|system design|refactor)\b/i],
    ['node-api-design', /\b(api|rest|graphql|endpoint|http|webhook)\b/i],
    ['node-typescript-services', /\btypescript|\bts\b/i],
    ['node-framework-nestjs', /\bnest(?:js)?\b/i],
    ['node-framework-express-fastify', /\bexpress|fastify\b/i],
    ['node-auth-security', /\b(auth\w*|oauth|jwt|security|permission|rbac|session|tenant|secret|upload|ssrf|injection)\b/i],
    ['node-data-access', /\b(database|data access|orm|query|persistence|migration)\b/i],
    ['node-postgres-data', /\bpostgres(?:ql)?|\bpg\b/i],
    ['node-queues-workers', /\b(queue|worker|background|job|kafka|rabbitmq|bullmq)\b/i],
    ['node-testing-quality', /\b(tests?|testing|specs?|coverage|quality)\b/i],
    ['node-performance-runtime', /\b(performance|profil|latency|memory|throughput|event loop)\b/i],
    ['node-observability-resilience', /\b(observability|logging|metrics|tracing|resilien|retry|health)\b/i],
    ['node-deployment-delivery', /\b(deploy|deployment|docker|container|ci\/cd|release|production)\b/i]
  ],
  python: [
    ['python-backend-architecture', /\b(architect|architecture|backend|service|system design|refactor)\b/i],
    ['python-fastapi-services', /\bfastapi\b/i],
    ['python-django-api', /\bdjango|\bdrf\b/i],
    ['python-typing-contracts', /\b(typing|type hints|pydantic|contract|schema)\b/i],
    ['python-async-concurrency', /\b(async|asyncio|concurren|parallel|worker)\b/i],
    ['python-data-persistence', /\b(database|sqlalchemy|postgres|sqlite|orm|migration|persistence)\b/i],
    ['python-security', /\b(auth\w*|security|oauth|jwt|permission|secret|vulnerab\w*|tenant|upload|ssrf|injection)\b/i],
    ['python-testing-quality', /\b(test|testing|pytest|coverage|quality)\b/i],
    ['python-packaging-deployment', /\b(packag|deploy|deployment|docker|container|ci\/cd|release|production)\b/i]
  ],
  ml: [
    ['ml-problem-framing', /\b(ml|machine learning|model|training|train|inference|prediction|forecast)\b/i],
    ['ml-data-quality', /\b(data|dataset|label|leakage|quality|split|sampling)\b/i],
    ['ml-feature-engineering', /\b(feature|embedding|preprocess|transform)\b/i],
    ['ml-experiment-reproducibility', /\b(train|training|experiment|reproduc|seed|tracking|wandb|mlflow)\b/i],
    ['ml-pytorch-model-design', /\b(pytorch|torch|neural|transformer|model architecture)\b/i],
    ['pytorch-training-systems', /\b(pytorch|torch|train|training|fine.?tun)\b/i],
    ['pytorch-distributed-training', /\b(distributed|multi.?gpu|ddp|fsdp|cluster)\b/i],
    ['ml-evaluation-validation', /\b(evaluate|evaluation|metric|validation|benchmark|test|accuracy|quality)\b/i],
    ['ml-hyperparameter-optimization', /\b(hyperparameter|tuning|optimi[sz]ation|sweep)\b/i],
    ['ml-transformers-finetuning', /\b(transformer|llm|hugging.?face|fine.?tun|lora|qlora)\b/i],
    ['ml-model-serving', /\b(serving|serve|inference|endpoint|api|deploy|deployment)\b/i],
    ['mlops-pipelines-registry', /\b(pipeline|registry|mlops|workflow|deploy|release)\b/i],
    ['ml-monitoring-drift', /\b(monitor|monitoring|drift|production|observability)\b/i],
    ['ml-gpu-performance', /\b(gpu|cuda|memory|throughput|performance|profil)\b/i],
    ['ml-inference-optimization', /\b(inference|latency|quantiz|batching|optimization|optimisation)\b/i],
    ['ml-privacy-supply-chain', /\b(privacy|pii|security|supply chain|license|provenance|governance)\b/i]
  ]
};

function unique(values) { return [...new Set(values)]; }

export function routeTask({ task = '', files = [], project = null, root = projectRoot } = {}) {
  const text = `${task}\n${files.join('\n')}`;
  const taskText = String(task);
  const normalizedFiles = files.map(file => String(file).replaceAll('\\', '/'));
  const hasNodeManifest = normalizedFiles.some(file => /(^|\/)(package\.json|pnpm-lock\.yaml|yarn\.lock|package-lock\.json|tsconfig\.json)$/i.test(file));
  const hasPythonManifest = normalizedFiles.some(file => /(^|\/)(pyproject\.toml|requirements[^/]*\.txt|Pipfile|poetry\.lock)$/i.test(file));
  const isUi = /\b(ui|ux|frontend|front-end|screen|component|layout|responsive|visual|design system|interface|dashboard|image generation|image asset|react|vue|svelte)\b/i.test(taskText)
    || normalizedFiles.some(file => /\.(tsx|jsx|vue|svelte)$/i.test(file));
  const isMobile = /\b(flutter|dart|android|ios|mobile|react native)\b/i.test(text)
    || normalizedFiles.some(file => /(^|\/)(pubspec\.yaml|androidmanifest\.xml)$/i.test(file));
  const isCloudData = /\b(bigquery|spark|dataproc|dataflow|dbt|dataform|data pipeline|data engineering|warehouse analytics)\b/i.test(text);
  const isNode = /\b(node(?:\.js)?|typescript|javascript|nestjs|express|fastify|npm|pnpm|yarn)\b/i.test(taskText)
    || (hasNodeManifest && /\b(backend|api|server|service|endpoint|worker)\b/i.test(taskText));
  const isPython = /\b(python|py(?:thon)?|fastapi|django|pytorch|torch|scikit.?learn|ml|machine learning|model training)\b/i.test(text)
    || (hasPythonManifest && /\b(backend|api|server|service|training|train|model)\b/i.test(taskText));
  const isDotnet = /\b(dotnet|asp\.net(?: core)?)\b/i.test(taskText)
    || /(?:^|\W)\.net(?:\W|$)|(?:^|\W)c\s?#(?:\W|$)/i.test(taskText)
    || normalizedFiles.some(file => /(^|\/)([^/]+\.(?:csproj|sln|fsproj)|global\.json)$/i.test(file) || /\.cs$/i.test(file));
  const isMl = /\b(ml|machine learning|pytorch|torch|training|train|dataset|transformer|llm|forecast)\b/i.test(taskText)
    || (!isUi && /\b(model|inference|serving)\b/i.test(taskText) && /\b(api|backend|server|deploy)\b/i.test(taskText));
  const isWorkflow = /\b(workflow|automation|automate|orchestrat\w*|approval|human.?in.?the.?loop|state machine|webhook|callback|scheduled job|cron|connector|integration flow|pipeline|runbook|operator console)\b/i.test(text);
  const isResearch = /\b(research|reference|inspiration|open.?source|official docs?|architecture decision|compare libraries|benchmark|reverse engineer|reconstruct|document the feature)\b/i.test(text);
  const hasApproval = /\b(approval|approve|approver|sign.?off|human.?in.?the.?loop|review gate)\b/i.test(text);
  const hasWebhook = /\b(webhook|event.?driven|callback|duplicate event|deduplication)\b/i.test(text);
  const hasRetryOrRecovery = /\b(retr(?:y|ies|ied)|compensation|recover\w*|resume|replay|dead.?letter|failure handling)\b/i.test(text);
  const hasSchedule = /\b(schedule(?:d)?|cron|recurring|time zone|timezone|calendar trigger)\b/i.test(text);
  const hasConnector = /\b(connector|integration|third.?party|external provider|oauth connection|sync with)\b/i.test(text);
  const hasDataContract = /\b(database|schema|postgres(?:ql)?|mysql|sql|data model|persist\w*|audit history|records?)\b/i.test(text);
  const hasRelease = /\b(release|deploy|rollout|feature flag|canary|rollback)\b/i.test(text);
  const hasQueue = /\b(queue|worker|backpressure|kafka|rabbitmq|bullmq|dead.?letter)\b/i.test(text);
  const groups = [];
  if (isNode) groups.push('node');
  if (isPython) groups.push('python');
  if (isMl) groups.push('ml');

  const selected = [];
  for (const group of groups) {
    const entries = catalog[group];
    for (const [name, pattern] of entries) if (pattern.test(text)) selected.push(name);
    if (group === 'node' && !selected.includes('node-backend-architecture')) selected.push('node-backend-architecture');
    if (group === 'python' && !selected.includes('python-backend-architecture')) selected.push('python-backend-architecture');
    if (group === 'ml' && !selected.includes('ml-problem-framing')) selected.push('ml-problem-framing');
  }
  if (isDotnet) {
    selected.push('dotnet-solution-architect', 'dotnet-secure-coding', 'dotnet-testing-strategy');
    if (/\b(api|rest|endpoint|asp\.net)\b/i.test(text)) selected.push('dotnet-aspnetcore-api', 'dotnet-openapi-contracts');
    if (/\b(auth\w*|oauth|jwt|rbac|permission|session)\b/i.test(text)) selected.push('dotnet-authentication-authorization');
    if (/\b(database|schema|sql|postgres|efcore|migration|persistence)\b/i.test(text)) selected.push('dotnet-efcore-data', 'dotnet-database-migrations');
    if (/\b(integration test|contract test)\b/i.test(text)) selected.push('dotnet-integration-testing');
  }
  if (isNode) selected.push('node-auth-security');
  if (isPython) selected.push('python-security');
  if (isNode && isMl) selected.push('backend-ml-integration');
  if (isUi && /\b(model|inference|prediction)\b/i.test(taskText)) selected.push('ml-model-serving', 'backend-ml-integration');
  if (isUi) selected.push('modern-ui-art-direction', 'design-reference-research', 'production-code-quality');
  if (isResearch || isUi || groups.length || isDotnet || isCloudData || isWorkflow) selected.push('reverse-engineering', 'reverse-deep-researcher', 'feature-documentation');
  if (isResearch || isUi) selected.push('autonomous-deep-researcher');
  if (isResearch) selected.push('workflow-source-research');
  if (isResearch || groups.length || isDotnet || isCloudData) selected.push('open-source-architecture-research');
  if (/\b(review|audit|verify|security|release|production|payment|migration|authorization|threat|vulnerab\w*|security case|penetration|secret)\b/i.test(taskText)) selected.push('security-casebook');
  if (isUi && /\b(image|asset|illustration|hero|mockup|visual)\b/i.test(text)) selected.push('production-image-generation');
  if (isCloudData) {
    if (/\bbigquery|dbt|dataform\b/i.test(text)) selected.push('bigquery-sql', 'dbt-bigquery', 'dataform-bigquery');
    if (/\bspark|dataproc\b/i.test(text)) selected.push('gcp-spark', 'gcp-spark-troubleshooting');
    if (/\bdataflow\b/i.test(text)) selected.push('gcp-dataflow');
    selected.push('gcp-data-pipelines', 'workflow-data-contracts', 'workflow-data-provenance');
  }
  if (isMobile) selected.push('production-code-quality');
  if (groups.length || isDotnet) selected.push('secure-design-threat-modeling', 'production-code-quality');

  if (isWorkflow) {
    selected.push(
      'workflow-intake-and-scope',
      'workflow-source-research',
      'workflow-requirements-to-contract',
      'workflow-state-machines',
      'workflow-testing-simulation',
      'workflow-observability'
    );
    if (hasDataContract) selected.push('workflow-data-contracts', 'workflow-data-provenance', 'workflow-database-change-control');
    if (hasApproval) selected.push('workflow-human-approval-gates', ...(isUi ? ['workflow-operator-console-ui'] : []));
    if (/\b(dag|parallel|fan.?out|fan.?in|orchestrat\w*|pipeline)\b/i.test(text)) selected.push('workflow-dag-orchestration', 'workflow-durable-execution', 'workflow-agent-handoffs');
    if (hasWebhook) selected.push('workflow-webhook-contracts', 'workflow-system-connectors', 'workflow-idempotency');
    if (hasRetryOrRecovery) selected.push('workflow-retries-compensation', 'workflow-recovery-runbooks', ...(hasWebhook ? ['workflow-idempotency'] : []));
    if (hasSchedule) selected.push('workflow-scheduled-jobs', 'workflow-durable-execution');
    if (hasConnector) selected.push('workflow-system-connectors', 'workflow-credential-lifecycle');
    if (hasQueue) selected.push('workflow-queues-backpressure', ...(hasRetryOrRecovery ? ['workflow-retries-compensation'] : []));
    if (hasRelease) selected.push('workflow-release-rollouts');
    if (/\b(quota|rate.?limit|cost|budget|usage cap)\b/i.test(text)) selected.push('workflow-cost-quota-controls');
    if (isUi && (hasApproval || /\b(operator|execution dashboard|operations dashboard|workflow console)\b/i.test(text))) selected.push('workflow-operator-console-ui');
  }

  const skills = unique(selected);
  const missing = skills.filter(name => !fs.existsSync(path.join(root, 'skills', name, 'SKILL.md')));
  if (missing.length) throw new Error(`Routed skill files are missing: ${missing.join(', ')}`);

  const supportProfiles = [];
  if (groups.length || isDotnet) supportProfiles.push('saas-architect');
  if (/\b(database|schema|sql|postgres|mysql|ledger|sap|erp|migration)\b/i.test(text)) supportProfiles.push('enterprise-schema-architect');
  if (isUi) supportProfiles.push('mansoor-ui-specialist');
  if (isMobile) supportProfiles.push('flutter-mobile-specialist');
  if (isCloudData) supportProfiles.push('cloud-data-engineer');
  if (isWorkflow) supportProfiles.push('workflow-automation-specialist');
  if (isResearch) supportProfiles.push('research-docs-specialist');

  const taskWorkers = [];
  const workflowWorkerSkills = name => name.startsWith('workflow-');
  if (isNode) taskWorkers.push({ role: 'node-backend-specialist', project, skills: skills.filter(name => name.startsWith('node-') || ['backend-ml-integration', 'secure-design-threat-modeling', 'production-code-quality'].includes(name) || workflowWorkerSkills(name)) });
  if (isPython) taskWorkers.push({ role: 'python-backend-specialist', project, skills: skills.filter(name => name.startsWith('python-') || ['secure-design-threat-modeling', 'production-code-quality'].includes(name) || workflowWorkerSkills(name)) });
  if (isDotnet) taskWorkers.push({ role: 'dotnet-backend-specialist', project, skills: skills.filter(name => name.startsWith('dotnet-') || ['secure-design-threat-modeling', 'production-code-quality'].includes(name) || workflowWorkerSkills(name)) });
  if (isMobile) taskWorkers.push({ role: 'flutter-mobile-specialist', project, skills: skills.filter(name => ['production-code-quality'].includes(name)) });
  if (isCloudData) taskWorkers.push({ role: 'cloud-data-engineer', project, skills: skills.filter(name => name.startsWith('gcp-') || name.startsWith('bigquery-') || ['dbt-bigquery', 'dataform-bigquery', 'workflow-data-contracts', 'workflow-data-provenance', 'production-code-quality'].includes(name)) });
  if (isResearch) taskWorkers.push({ role: 'research-docs-specialist', project, skills: skills.filter(name => ['reverse-engineering', 'reverse-deep-researcher', 'open-source-architecture-research', 'feature-documentation', 'workflow-source-research', 'autonomous-deep-researcher'].includes(name)) });
  if (isMl) taskWorkers.push({ role: 'ml-systems-specialist', project, skills: skills.filter(name => name.startsWith('ml-') || name.startsWith('mlops-') || name.startsWith('pytorch-') || ['backend-ml-integration', 'secure-design-threat-modeling', 'production-code-quality'].includes(name) || workflowWorkerSkills(name)) });
  if (isWorkflow) taskWorkers.push({ role: 'workflow-automation-specialist', project, skills: skills.filter(workflowWorkerSkills) });
  const reviewRequested = /\b(review|audit|verify|security|release|production|payment|migration|authorization)\b/i.test(taskText);
  if (reviewRequested) taskWorkers.push({ role: /\b(security|authorization|payment|tenant)\b/i.test(taskText) ? 'application-security-reviewer' : 'qa-release-specialist', project, skills: skills.filter(name => ['secure-design-threat-modeling', 'production-code-quality', 'gravitas-verification', 'dotnet-testing-strategy', 'node-testing-quality', 'python-testing-quality'].includes(name)) });
  const routedSkills = unique(selected);
  const missingVerifierSkills = routedSkills.filter(name => !fs.existsSync(path.join(root, 'skills', name, 'SKILL.md')));
  if (missingVerifierSkills.length) throw new Error(`Routed skill files are missing: ${missingVerifierSkills.join(', ')}`);

  return {
    manager: 'production-orchestrator',
    project,
    supportProfiles: unique(supportProfiles),
    taskWorkers,
    skills: routedSkills,
    coordination: taskWorkers.length > 1
      ? 'The manager assigns one primary domain expert plus only a requested/high-risk reviewer, with disjoint file ownership.'
      : 'The manager handles the task or assigns one matching persistent domain specialist.',
    workflow: [
      'discover repository, runtime versions, constraints, and existing contracts',
      'load or refresh this project memory; architecture profile reviews boundaries when selected',
      'manager selects only the global skills needed and writes worker handoff contracts',
      ...(isWorkflow ? ['inspect the real schema, API, permissions, workflow states and representative records before proposing the product flow; never substitute chat-only or invented production data'] : []),
      ...(isWorkflow && hasApproval ? ['separate design approval from runtime business approval; persist business approval state, actor, reason, version and audit event through authorized database/API transitions'] : []),
      ...(isUi ? ['use the installed local design skills and inspect product assets; show a compact blueprint only when a material direction is open'] : []),
      ...(groups.length ? ['apply shared threat modeling and stack-specific security; verify denied and cross-tenant paths'] : []),
      ...(isDotnet ? ['apply .NET security and verification skills; keep .NET architecture and deployment decisions evidence-based'] : []),
      'use one primary domain expert; parallelize only when file ownership is independent and necessary',
      ...(isMl ? ['block training or release on split integrity, leakage checks, reproducibility, and task-appropriate evaluation'] : []),
      'independent verification by the manager or verifier checks tests, security, runtime behavior, and changed-file scope',
      'report evidence, limitations, and rollback or next-step notes'
    ]
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const taskIndex = args.indexOf('--task');
  const task = taskIndex >= 0 ? args[taskIndex + 1] ?? '' : '';
  const projectIndex = args.indexOf('--project');
  const project = projectIndex >= 0 ? args[projectIndex + 1] ?? null : null;
  const filesIndex = args.indexOf('--files');
  const rootIndex = args.indexOf('--root');
  const endIndex = [rootIndex, projectIndex, args.length].filter(index => index > filesIndex).sort((a, b) => a - b)[0] ?? args.length;
  const files = filesIndex >= 0 ? args.slice(filesIndex + 1, endIndex).filter(value => !value.startsWith('--')) : [];
  const root = rootIndex >= 0 ? args[rootIndex + 1] : projectRoot;
  process.stdout.write(`${JSON.stringify(routeTask({ task, files, project, root }), null, 2)}\n`);
}
