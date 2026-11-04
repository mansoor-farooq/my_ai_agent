import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { routeTask } from '../route-backend-ml-task.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('routes Node API work through one manager with a scoped backend worker and focused skills', () => {
  const result = routeTask({ task: 'Build a Node.js TypeScript REST API with PostgreSQL auth and tests', files: ['package.json', 'tsconfig.json'], root });
  assert.equal(result.manager, 'production-orchestrator');
  assert.ok(result.supportProfiles.includes('saas-architect'));
  assert.ok(result.taskWorkers.some(worker => worker.role === 'node-backend-specialist'));
  assert.ok(!('agents' in result), 'router must not register backend specialists as peer agents');
  for (const name of ['node-backend-architecture', 'node-api-design', 'node-auth-security', 'node-testing-quality']) assert.ok(result.skills.includes(name), name);
  assert.ok(result.skills.length < 20, 'routing should choose a focused subset');
});
test('routes PyTorch training through one manager with a scoped ML worker and architecture review', () => {
  const result = routeTask({ task: 'Train and evaluate a PyTorch transformer model on a dataset', files: ['pyproject.toml', 'train.py'], root });
  assert.equal(result.manager, 'production-orchestrator');
  assert.ok(result.supportProfiles.includes('saas-architect'));
  assert.ok(result.taskWorkers.some(worker => worker.role === 'python-backend-specialist'));
  assert.ok(result.taskWorkers.some(worker => worker.role === 'ml-systems-specialist'));
  for (const name of ['pytorch-training-systems', 'ml-data-quality', 'ml-evaluation-validation', 'ml-experiment-reproducibility']) assert.ok(result.skills.includes(name), name);
});

test('combines Node serving with ML inference and emits coordination/verifier workflow', () => {
  const result = routeTask({ task: 'Deploy model inference behind a Node API', files: ['package.json'], root });
  assert.equal(result.manager, 'production-orchestrator');
  assert.ok(result.taskWorkers.some(worker => worker.role === 'node-backend-specialist'));
  assert.ok(result.taskWorkers.some(worker => worker.role === 'ml-systems-specialist'));
  assert.ok(result.workflow.some(step => step.includes('contracts')));
  assert.ok(result.workflow.some(step => step.includes('independent verification')));
});

test('routes modern UI design to the UI specialist without enabling image connectors', () => {
  const result = routeTask({
    task: 'Design a distinctive modern dashboard with a premium product image treatment',
    files: ['src/app/page.tsx'],
    root
  });
  assert.ok(result.supportProfiles.includes('mansoor-ui-specialist'));
  for (const name of ['modern-ui-art-direction', 'design-reference-research', 'production-code-quality']) {
    assert.ok(result.skills.includes(name), name);
  }
  assert.ok(result.skills.includes('production-image-generation'));
});

test('does not configure external image generation for standalone asset requests', () => {
  const result = routeTask({ task: 'Generate a realistic product photo for a catalog listing', root });
  assert.ok(!result.skills.includes('production-image-generation'));
  assert.ok(!result.supportProfiles.includes('mansoor-ui-specialist'));
});

test('routes .NET implementation to a scoped specialist with security and quality review skills', () => {
  const result = routeTask({
    task: 'Build a secure ASP.NET Core API with authentication, integration tests and a security review',
    files: ['Product.sln', 'src/Api/Api.csproj'],
    root
  });
  assert.ok(result.taskWorkers.some(worker => worker.role === 'dotnet-backend-specialist'));
  for (const name of ['dotnet-solution-architect', 'dotnet-secure-coding', 'dotnet-authentication-authorization', 'dotnet-testing-strategy', 'secure-design-threat-modeling', 'production-code-quality']) {
    assert.ok(result.skills.includes(name), name);
  }
  const worker = result.taskWorkers.find(item => item.role === 'dotnet-backend-specialist');
  assert.ok(worker.skills.includes('dotnet-secure-coding'));
  const verifier = result.taskWorkers.find(item => item.role === 'application-security-reviewer');
  assert.ok(verifier.skills.includes('dotnet-testing-strategy'));
});

test('keeps UI and backend specialists available for a mixed admin-interface task', () => {
  const result = routeTask({ task: 'Build a React admin dashboard backed by a Node API', files: ['package.json', 'src/page.tsx'], root });
  assert.ok(result.supportProfiles.includes('mansoor-ui-specialist'));
  assert.ok(result.supportProfiles.includes('saas-architect'));
  assert.ok(result.skills.includes('modern-ui-art-direction'));
  assert.ok(result.skills.includes('node-api-design'));
});

test('routes a data-backed workflow UI through research, approval, database and operator-console skills', () => {
  const result = routeTask({
    task: 'Design a customer onboarding automation with a React operations dashboard, PostgreSQL approval records, scheduled follow-ups, retries, and audit history',
    files: ['package.json', 'src/app/workflows/page.tsx'],
    root
  });
  for (const name of [
    'workflow-intake-and-scope',
    'workflow-source-research',
    'workflow-requirements-to-contract',
    'workflow-state-machines',
    'workflow-data-contracts',
    'workflow-human-approval-gates',
    'workflow-scheduled-jobs',
    'workflow-retries-compensation',
    'workflow-data-provenance',
    'workflow-observability',
    'workflow-testing-simulation',
    'workflow-operator-console-ui'
  ]) assert.ok(result.skills.includes(name), name);
  assert.ok(result.taskWorkers.some(worker => worker.role === 'workflow-automation-specialist'));
  assert.ok(result.supportProfiles.includes('mansoor-ui-specialist'));
});

test('selects webhook, idempotency, connector and recovery skills from workflow conditions', () => {
  const result = routeTask({
    task: 'Build a webhook integration that deduplicates events and retries transient failures with recovery logs',
    files: ['services/webhook.ts'],
    root
  });
  for (const name of [
    'workflow-intake-and-scope',
    'workflow-webhook-contracts',
    'workflow-system-connectors',
    'workflow-idempotency',
    'workflow-retries-compensation',
    'workflow-recovery-runbooks',
    'workflow-testing-simulation'
  ]) assert.ok(result.skills.includes(name), name);
});

test('selects persisted data and schema controls for PostgreSQL workflow requests', () => {
  const result = routeTask({
    task: 'Create an approval workflow stored in PostgreSQL with data lineage and audit records',
    root
  });
  for (const name of ['workflow-data-contracts', 'workflow-data-provenance', 'workflow-database-change-control']) {
    assert.ok(result.skills.includes(name), name);
  }
});

test('does not preload workflow skills for an unrelated bounded code task', () => {
  const result = routeTask({ task: 'Fix the icon alignment in this React button', files: ['src/Button.tsx'], root });
  assert.ok(result.skills.includes('modern-ui-art-direction'));
  assert.ok(!result.skills.some(name => name.startsWith('workflow-')));
});

test('adds shared security and code-quality skills to backend work without manual selection', () => {
  const result = routeTask({
    task: 'Build a Python FastAPI multi-tenant service with authentication',
    files: ['pyproject.toml', 'app/main.py'],
    root
  });
  for (const name of ['secure-design-threat-modeling', 'production-code-quality', 'python-security']) {
    assert.ok(result.skills.includes(name), name);
  }
  const worker = result.taskWorkers.find(item => item.role === 'python-backend-specialist');
  assert.ok(worker.skills.includes('secure-design-threat-modeling'));
  assert.ok(worker.skills.includes('production-code-quality'));
});

test('manifest evidence alone selects a backend route, and all selected skills exist', () => {
  const result = routeTask({ task: 'Fix service', files: ['requirements.txt', 'app.py'], root });
  assert.equal(result.manager, 'production-orchestrator');
  assert.ok(result.taskWorkers.some(worker => worker.role === 'python-backend-specialist'));
  for (const name of result.skills) assert.ok(fs.existsSync(`${root}/skills/${name}/SKILL.md`), name);
});

test('portable team profiles and router skill are present for installation', () => {
  assert.ok(fs.existsSync(`${root}/skills/backend-ml-skill-router/SKILL.md`));
  for (const name of ['production-orchestrator', 'saas-architect', 'mansoor-ui-specialist']) assert.ok(fs.existsSync(`${root}/agents/Antigravity/custom-agents/${name}/agent.md`), name);
  for (const name of ['node-backend-specialist', 'python-backend-specialist', 'ml-systems-specialist', 'flutter-mobile-specialist', 'cloud-data-engineer']) assert.ok(fs.existsSync(`${root}/agents/Antigravity/custom-agents/${name}/agent.md`), name);
  assert.equal(fs.readdirSync(`${root}/skills`).filter(name => /^(node-|python-|ml-|pytorch-|backend-ml-)/.test(name)).length, 40);
});

test('UI work routes review to Mansoor UI specialist under the manager', () => {
  const result = routeTask({ task: 'Build a responsive React UI for model inference', files: ['package.json', 'App.tsx'], root });
  assert.equal(result.manager, 'production-orchestrator');
  assert.ok(result.supportProfiles.includes('mansoor-ui-specialist'));
  assert.ok(!result.supportProfiles.includes('node-backend-specialist'));
});

test('project identity follows every temporary worker so parallel project memories stay separate', () => {
  const result = routeTask({ project: 'Cartivo', task: 'Build a Node.js API and train a PyTorch model', files: ['package.json', 'pyproject.toml'], root });
  assert.equal(result.project, 'Cartivo');
  assert.ok(result.taskWorkers.length > 1);
  assert.ok(result.taskWorkers.every(worker => worker.project === 'Cartivo'));
});
