#!/usr/bin/env node
import crypto from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUSTOM_SKILL_IDS } from './custom-skill-wave.mjs';
import { PREMIUM_SKILL_IDS } from './premium-domain-capsules.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CODEX_CUSTOM_SKILL_IDS = Object.freeze([...new Set([
  ...CUSTOM_SKILL_IDS,
  ...PREMIUM_SKILL_IDS,
  'project-context-orchestrator',
])]);

function hash(text) { return crypto.createHash('sha256').update(text, 'utf8').digest('hex'); }

async function readSkill(sourceRoot, id) {
  const file = path.join(sourceRoot, 'skills', id, 'SKILL.md');
  return { file, text: await readFile(file, 'utf8') };
}

function isManaged(text, id) {
  return new RegExp(`^name:\\s*${id.replaceAll('-', '\\-')}\\s*$`, 'm').test(text)
    && /^description:\s*Use when /m.test(text);
}

export async function syncCustomSkills({ sourceRoot = root, targetRoot = path.join(os.homedir(), '.agents', 'skills'), stateFile = path.join(os.homedir(), '.agents', 'mansoor-custom-skills.json') } = {}) {
  const state = { schema: 'mansoor.codex-custom-skills/v1', source: 'locally-authored', skills: [], skipped: [], updatedAt: new Date().toISOString() };
  await mkdir(targetRoot, { recursive: true });
  for (const id of CODEX_CUSTOM_SKILL_IDS) {
    const source = path.join(sourceRoot, 'skills', id);
    const target = path.join(targetRoot, id);
    if (existsSync(target)) {
      const existing = await readFile(path.join(target, 'SKILL.md'), 'utf8').catch(() => '');
      if (!isManaged(existing, id)) {
        state.skipped.push({ id, reason: 'unmanaged-skill-preserved' });
        continue;
      }
    }
    await cp(source, target, { recursive: true, force: true });
    const installed = await readFile(path.join(target, 'SKILL.md'), 'utf8');
    state.skills.push({ id, path: target, sha256: hash(installed) });
  }
  await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  return state;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncCustomSkills().then((state) => console.log(`Synced ${state.skills.length} Mansoor custom skills to Codex shared skills; preserved ${state.skipped.length} unmanaged skill(s).`)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}

