import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertAgentProfile } from '../install-gemini-cli-team.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('Antigravity package adds the PTFC prompt contract to every shipped profile', async () => {
  const build = await readFile(path.join(root, 'tools', 'build-antigravity-plugin.mjs'), 'utf8');
  for (const field of ['Persona', 'Task', 'Context', 'Format', 'bounded answer check', 'targeted follow-up']) assert.match(build, new RegExp(field, 'i'));
  assert.match(build, /never enter a repeated.*verifying.*loop/i);
  const manager = await readFile(path.join(root, 'agents', 'Antigravity', 'custom-agents', 'production-orchestrator', 'agent.md'), 'utf8');
  assert.match(manager, /PreToolUse.*JSON-hook failure/i);
  assert.match(manager, /never substitute a similarly named/i);
});

test('Gemini profile conversion adds the same contract without changing the declared route', async () => {
  const source = await readFile(path.join(root, 'agents', 'Antigravity', 'custom-agents', 'web-audit-specialist', 'agent.md'), 'utf8');
  const converted = convertAgentProfile(source, { slug: 'mam-web-audit-specialist', isManager: false });
  for (const field of ['Persona', 'Task', 'Context', 'Format', 'bounded answer check']) assert.match(converted, new RegExp(field, 'i'));
  assert.match(converted, /name: mam-web-audit-specialist/);
  assert.match(converted, /mam-live-web-quality-auditor/);
});
