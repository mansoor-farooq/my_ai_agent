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
  assert.ok(result.taskWorkers.some(worker => worker.role === 'node-backend-builder'));
  assert.ok(result.taskWorkers.some(worker => worker.role === 'independent-verifier'));
  assert.ok(!('agents' in result), 'router must not register backend specialists as peer agents');
  for (const name of ['node-backend-architecture', 'node-api-design', 'node-auth-security', 'node-testing-quality']) assert.ok(result.skills.includes(name), name);
  assert.ok(result.skills.length < 12, 'routing should choose a focused subset');
});
test('routes PyTorch training through one manager with a scoped ML worker and architecture review', () => {
  const result = routeTask({ task: 'Train and evaluate a PyTorch transformer model on a dataset', files: ['pyproject.toml', 'train.py'], root });
  assert.equal(result.manager, 'production-orchestrator');
  assert.ok(result.supportProfiles.includes('saas-architect'));
  assert.ok(result.taskWorkers.some(worker => worker.role === 'python-backend-builder'));
  assert.ok(result.taskWorkers.some(worker => worker.role === 'ml-engineer-pytorch'));
  assert.ok(result.taskWorkers.some(worker => worker.role === 'independent-verifier'));
  for (const name of ['pytorch-training-systems', 'ml-data-quality', 'ml-evaluation-validation', 'ml-experiment-reproducibility']) assert.ok(result.skills.includes(name), name);
});

test('combines Node serving with ML inference and emits coordination/verifier workflow', () => {
  const result = routeTask({ task: 'Deploy model inference behind a Node API', files: ['package.json'], root });
  assert.equal(result.manager, 'production-orchestrator');
  assert.ok(result.taskWorkers.some(worker => worker.role === 'node-backend-builder'));
  assert.ok(result.taskWorkers.some(worker => worker.role === 'ml-engineer-pytorch'));
  assert.ok(result.workflow.some(step => step.includes('contracts')));
  assert.ok(result.workflow.some(step => step.includes('independent verification')));
});

test('manifest evidence alone selects a backend route, and all selected skills exist', () => {
  const result = routeTask({ task: 'Fix service', files: ['requirements.txt', 'app.py'], root });
  assert.equal(result.manager, 'production-orchestrator');
  assert.ok(result.taskWorkers.some(worker => worker.role === 'python-backend-builder'));
  for (const name of result.skills) assert.ok(fs.existsSync(`${root}/skills/${name}/SKILL.md`), name);
});

test('portable team profiles and router skill are present for installation', () => {
  assert.ok(fs.existsSync(`${root}/skills/backend-ml-skill-router/SKILL.md`));
  for (const name of ['production-orchestrator', 'saas-architect', 'mansoor-ui-specialist']) assert.ok(fs.existsSync(`${root}/agents/Antigravity/custom-agents/${name}/agent.md`), name);
  for (const name of ['node-backend-specialist', 'python-backend-specialist', 'ml-pytorch-specialist']) assert.ok(!fs.existsSync(`${root}/agents/Antigravity/custom-agents/${name}/agent.md`), name);
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
