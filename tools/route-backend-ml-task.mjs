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
    ['node-auth-security', /\b(auth|oauth|jwt|security|permission|rbac|session)\b/i],
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
    ['python-security', /\b(auth|security|oauth|jwt|permission|secret|vulnerab)\b/i],
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
  const isUi = /\b(ui|ux|frontend|front-end|screen|component|layout|responsive|visual|design system|react|vue|svelte)\b/i.test(taskText)
    || normalizedFiles.some(file => /\.(tsx|jsx|vue|svelte)$/i.test(file));
  const isNode = /\b(node(?:\.js)?|typescript|javascript|nestjs|express|fastify|npm|pnpm|yarn)\b/i.test(taskText)
    || (hasNodeManifest && /\b(backend|api|server|service|endpoint|worker)\b/i.test(taskText));
  const isPython = /\b(python|py(?:thon)?|fastapi|django|pytorch|torch|scikit.?learn|ml|machine learning|model training)\b/i.test(text)
    || (hasPythonManifest && /\b(backend|api|server|service|training|train|model)\b/i.test(taskText));
  const isMl = /\b(ml|machine learning|pytorch|torch|training|train|dataset|transformer|llm|forecast)\b/i.test(taskText)
    || (!isUi && /\b(model|inference|serving)\b/i.test(taskText) && /\b(api|backend|server|deploy)\b/i.test(taskText));
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
  if (isNode && isMl) selected.push('backend-ml-integration');
  if (isUi && /\b(model|inference|prediction)\b/i.test(taskText)) selected.push('ml-model-serving', 'backend-ml-integration');

  const skills = unique(selected);
  const missing = skills.filter(name => !fs.existsSync(path.join(root, 'skills', name, 'SKILL.md')));
  if (missing.length) throw new Error(`Routed skill files are missing: ${missing.join(', ')}`);

  const supportProfiles = [];
  if (groups.length) supportProfiles.push('saas-architect');
  if (/\b(database|schema|sql|postgres|mysql|ledger|sap|erp|migration)\b/i.test(text)) supportProfiles.push('enterprise-schema-architect');
  if (isUi) supportProfiles.push('mansoor-ui-specialist');

  const taskWorkers = [];
  if (isNode) taskWorkers.push({ role: 'node-backend-builder', project, skills: skills.filter(name => name.startsWith('node-') || name === 'backend-ml-integration') });
  if (isPython) taskWorkers.push({ role: 'python-backend-builder', project, skills: skills.filter(name => name.startsWith('python-')) });
  if (isMl) taskWorkers.push({ role: 'ml-engineer-pytorch', project, skills: skills.filter(name => name.startsWith('ml-') || name.startsWith('mlops-') || name.startsWith('pytorch-') || name === 'backend-ml-integration') });
  if (groups.length) {
    selected.push('gravitas-verification');
    taskWorkers.push({ role: 'independent-verifier', project, skills: ['gravitas-verification'] });
  }
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
      ? 'The manager assigns task-scoped workers, gives each disjoint file ownership, and resolves their contracts; architecture/UI profiles advise only when selected.'
      : 'The manager handles the task or assigns one task-scoped worker; persistent profile count stays unchanged.',
    workflow: [
      'discover repository, runtime versions, constraints, and existing contracts',
      'load or refresh this project memory; architecture profile reviews boundaries when selected',
      'manager selects only the global skills needed and writes worker handoff contracts',
      'parallelize independent task-scoped workers with non-overlapping file ownership',
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
