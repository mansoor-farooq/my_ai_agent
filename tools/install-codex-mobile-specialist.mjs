import { cp, mkdir, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = os.homedir();
const bundledSkillRoot = existsSync(path.join(root, 'skill-library')) ? 'skill-library' : 'skills';
const sourceSkill = path.join(root, bundledSkillRoot, 'flutter-mobile-master-engineer');
const sourceAgent = path.join(root, '.codex', 'agents', 'flutter-mobile-specialist.toml');
const targetSkill = path.join(home, '.agents', 'skills', 'flutter-mobile-master-engineer');
const targetAgent = path.join(home, '.codex', 'agents', 'flutter-mobile-specialist.toml');

async function managedSkill(directory) {
  try {
    const content = await readFile(path.join(directory, 'SKILL.md'), 'utf8');
    return /^author:\s*Mansoor AI Team Manager\s*$/m.test(content) && /^source:\s*locally-authored\s*$/m.test(content);
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function sameFile(left, right) {
  try { return (await readFile(left, 'utf8')) === (await readFile(right, 'utf8')); }
  catch (error) { if (error?.code === 'ENOENT') return false; throw error; }
}

async function syncSkill() {
  let entries = [];
  try { entries = await readdir(targetSkill); }
  catch (error) { if (error?.code !== 'ENOENT') throw error; }
  if (entries.length && !(await managedSkill(targetSkill))) {
    throw new Error(`Refusing to replace an existing non-Mansoor skill at ${targetSkill}`);
  }
  await mkdir(path.dirname(targetSkill), { recursive: true });
  await cp(sourceSkill, targetSkill, { recursive: true, force: true });
}

async function syncAgent() {
  const existingIsManaged = await sameFile(targetAgent, sourceAgent);
  let current = '';
  try { current = await readFile(targetAgent, 'utf8'); }
  catch (error) { if (error?.code !== 'ENOENT') throw error; }
  if (current && !existingIsManaged && !current.includes('# Managed by Mansoor AI Team Manager')) {
    throw new Error(`Refusing to replace an existing custom Codex agent at ${targetAgent}`);
  }
  await mkdir(path.dirname(targetAgent), { recursive: true });
  const source = await readFile(sourceAgent, 'utf8');
  await import('node:fs/promises').then(({ writeFile }) => writeFile(targetAgent, `# Managed by Mansoor AI Team Manager\n${source}`));
}

await syncSkill();
await syncAgent();
console.log(`Installed Flutter Mobile Specialist and master skill for Codex under ${home}. Start a new Codex session to discover the custom agent and skill.`);
