import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const managerProfile = await readFile(path.join(root, 'agents', 'Antigravity', 'custom-agents', 'production-orchestrator', 'agent.md'), 'utf8');
const imageSkill = await readFile(path.join(root, 'skills', 'production-image-generation', 'SKILL.md'), 'utf8');

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
  assert.match(activitySection, /compact parent-chat progress card/i);
  assert.match(activitySection, /current wave/i);
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

test('manager schedules independent specialist chunks while image work keeps one artifact owner', () => {
  assert.match(managerProfile, /small work-item graph/i);
  assert.match(managerProfile, /concurrently in waves capped at three/i);
  assert.match(managerProfile, /owned paths/i);
  assert.match(managerProfile, /plan\.mjs.*input-json/is);
  assert.match(imageSkill, /one owner for the final image asset/i);
  assert.match(imageSkill, /up to three independent work items concurrently/i);
  assert.match(imageSkill, /Do not launch extra workers for a simple resize/i);
  assert.match(imageSkill, /Do not launch multiple generations in parallel/i);
  assert.match(imageSkill, /at most one local correction/i);
});

test('manager exposes the Mansoor AI Team Manager display name while preserving its routing id', () => {
  assert.match(managerProfile, /^name: Mansoor AI Team Manager$/m);
  assert.match(managerProfile, /# Mansoor AI Team Manager/);
  assert.match(managerProfile, /internal routing id: `production-orchestrator`/i);
});

test('manager keeps the default skill context lean and defers premium bodies to specialists', () => {
  const skills = [...managerProfile.matchAll(/^  - skills\//gm)].map((match) => match[0]);
  assert.ok(skills.length <= 10, `expected at most 10 default manager skills, got ${skills.length}`);
  assert.match(managerProfile, /skills\/efficient-context/);
  assert.doesNotMatch(managerProfile, /skills\/(?:reverse-deep-researcher|autonomous-deep-researcher|open-source-architecture-research|security-casebook|secure-design-threat-modeling)\b/);
});

test('manager fast lane has explicit latency budgets and source-reuse image fallback', () => {
  assert.match(managerProfile, /Gemini 3\.8 Flash.*Low/is);
  assert.match(managerProfile, /cannot force a paid model.*rotate accounts/is);
  assert.match(managerProfile, /12 relevant context files.*6 full skill bodies.*12 tool calls/is);
  assert.match(managerProfile, /zero web queries.*one verification command.*zero idle polling/is);
  assert.match(managerProfile, /source-reuse/i);
  assert.match(managerProfile, /fetch the page once/i);
  assert.match(managerProfile, /Do not call `generate_image` for an existing banner/i);
});

test('image work separates authorized reuse, public inspiration and new generation', () => {
  assert.match(imageSkill, /classify the request into exactly one primary intent/i);
  assert.match(imageSkill, /Exact source reuse/i);
  assert.match(imageSkill, /Inspired original/i);
  assert.match(imageSkill, /New decorative generation/i);
  assert.match(imageSkill, /Public visibility is not proof of reuse rights/i);
  assert.match(imageSkill, /user request is the acceptance contract/i);
  assert.match(imageSkill, /source URL, ownership\/authorization status, local asset path and hash/i);
  assert.match(imageSkill, /crop-safe zones/i);
  assert.match(managerProfile, /Public visibility alone is not reuse permission/i);
  assert.match(managerProfile, /Never invent product claims, logos, prices, labels or legal copy/i);
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

test('manager routes GitHub URL installation through the signed bootstrap only', () => {
  assert.match(managerProfile, /GitHub URL installation/i);
  assert.match(managerProfile, /Install-Ultra-Agent\.cmd/);
  assert.match(managerProfile, /approved signed.*mansoor-agent-hub\.zip/is);
  assert.match(managerProfile, /Never run arbitrary repository source/i);
  assert.match(managerProfile, /no signed release asset/i);
});
