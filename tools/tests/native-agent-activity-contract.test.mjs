import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const managerProfile = await readFile(path.join(root, 'agents', 'Antigravity', 'custom-agents', 'production-orchestrator', 'agent.md'), 'utf8');

function readSection(markdown, heading, nextHeading) {
  const headingStart = markdown.indexOf(heading);
  assert.notEqual(headingStart, -1, `Missing section: ${heading}`);
  const bodyStart = headingStart + heading.length;
  const end = markdown.indexOf(nextHeading, bodyStart);
  assert.notEqual(end, -1, `Missing following section: ${nextHeading}`);
  return markdown.slice(bodyStart, end);
}

const activitySection = readSection(managerProfile, '## Native agent activity in parent chat', '## Ultra Agent v2 runtime');
const memoryResearchSection = readSection(managerProfile, '## Project memory and feature research gate', '## Research and UI approval gate');

test('manager makes native subagent assignments and meaningful status visible in the parent chat', () => {
  assert.match(activitySection, /Before invoking `invoke_subagent`/i);
  assert.match(activitySection, /name.{0,50}role.{0,80}scope.{0,100}deliverable/is);
  assert.match(activitySection, /read-only or may edit files/i);
  assert.match(activitySection, /meaningful milestone/i);
  assert.match(activitySection, /worker is blocked/i);
  assert.match(activitySection, /Do not spam the chat with every tool call or poll loop/i);
  assert.match(activitySection, /changed files/i);
  assert.match(activitySection, /checks actually run/i);
  assert.match(activitySection, /manager owns integration and final verification/i);
  assert.match(activitySection, /Never claim.{0,160}unless the native tool\/result/is);
  assert.match(activitySection, /do not direct the user to a separate browser dashboard/i);
  assert.match(activitySection, /Never reveal hidden reasoning/i);
  assert.match(managerProfile, /You are the only manager/i);
});

test('manager validates selected-project memory and researches features before approval-gated edits', () => {
  assert.match(memoryResearchSection, /selected project's `\.agents\/memory\//i);
  assert.match(memoryResearchSection, /project identity and freshness/i);
  assert.match(memoryResearchSection, /do not copy or merge memory across projects/i);
  assert.match(memoryResearchSection, /material feature.{0,200}before changing product code/is);
  assert.match(memoryResearchSection, /current source-led and market\/competitor research/i);
  assert.match(memoryResearchSection, /linked sources/i);
  assert.match(memoryResearchSection, /2–3 options/i);
  assert.match(memoryResearchSection, /Wait for explicit user approval before the first product-code edit/i);
  assert.match(memoryResearchSection, /routine.{0,150}fast path/is);
  assert.match(memoryResearchSection, /Preserve the existing project layout/i);
  assert.match(memoryResearchSection, /A project-wide restructure.{0,180}explicit approval/is);
  assert.match(memoryResearchSection, /quota.{0,150}resumable checkpoint/is);
  assert.match(memoryResearchSection, /Never automatically switch accounts or rotate credentials to bypass a provider quota/i);
});


test('manager uses project-scoped PostgreSQL RAG with evidence boundaries', () => {
  const ragStart = managerProfile.indexOf('## Project-scoped PostgreSQL RAG');
  assert.notEqual(ragStart, -1, 'Missing section: ## Project-scoped PostgreSQL RAG');
  const ragSection = managerProfile.slice(ragStart);
  assert.match(ragSection, /tools\/ultra-agent-v2\/rag\.mjs/);
  assert.match(ragSection, /selected project.*--dir.*--project/is);
  assert.match(ragSection, /missing or stale/i);
  assert.match(ragSection, /path.*line range.*projectId.*sourceHash/is);
  assert.match(ragSection, /Never index raw prompts.*credentials.*\.env.*dependencies.*unrelated projects/is);
  assert.match(ragSection, /PostgreSQL full-text retrieval/i);
  assert.match(ragSection, /embedding provider.*optional/i);
});
