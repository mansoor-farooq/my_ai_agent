import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { routeTask } from '../route-backend-ml-task.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('routes Node API work to the Node backend lead and focused API/security/testing skills', () => {
  const result = routeTask({ task: 'Build a Node.js TypeScript REST API with PostgreSQL auth and tests', files: ['package.json', 'tsconfig.json'], root });
  assert.equal(result.agents[0], 'node-backend-specialist');
  for (const name of ['node-backend-architecture', 'node-api-design', 'node-auth-security', 'node-testing-quality']) assert.ok(result.skills.includes(name), name);
  assert.ok(result.skills.length < 12, 'routing should choose a focused subset');
});
test('routes PyTorch training work to Python and ML specialists with leakage/evaluation gates', () => {
  const result = routeTask({ task: 'Train and evaluate a PyTorch transformer model on a dataset', files: ['pyproject.toml', 'train.py'], root });
  assert.deepEqual(result.agents, ['python-backend-specialist', 'ml-pytorch-specialist']);
  for (const name of ['pytorch-training-systems', 'ml-data-quality', 'ml-evaluation-validation', 'ml-experiment-reproducibility']) assert.ok(result.skills.includes(name), name);
});

test('combines Node serving with ML inference and emits coordination/verifier workflow', () => {
  const result = routeTask({ task: 'Deploy model inference behind a Node API', files: ['package.json'], root });
  assert.deepEqual(result.agents, ['node-backend-specialist', 'ml-pytorch-specialist']);
  assert.ok(result.workflow.some(step => step.includes('contracts')));
  assert.ok(result.workflow.some(step => step.includes('independent verification')));
});

test('manifest evidence alone selects a backend route, and all selected skills exist', () => {
  const result = routeTask({ task: 'Fix service', files: ['requirements.txt', 'app.py'], root });
  assert.ok(result.agents.includes('python-backend-specialist'));
  for (const name of result.skills) assert.ok(fs.existsSync(`${root}/skills/${name}/SKILL.md`), name);
});

test('portable team profiles and router skill are present for installation', () => {
  assert.ok(fs.existsSync(`${root}/skills/backend-ml-skill-router/SKILL.md`));
  for (const name of ['node-backend-specialist', 'python-backend-specialist', 'ml-pytorch-specialist']) {
    assert.ok(fs.existsSync(`${root}/agents/Antigravity/custom-agents/${name}/agent.md`), name);
  }
  assert.equal(fs.readdirSync(`${root}/skills`).filter(name => /^(node-|python-|ml-|pytorch-|backend-ml-)/.test(name)).length, 40);
});\n