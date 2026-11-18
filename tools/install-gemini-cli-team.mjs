#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const home = process.env.USERPROFILE || process.env.HOME;
const geminiRoot = process.env.GEMINI_CLI_HOME || (home && path.join(home, '.gemini'));
const marker = '<!-- managed-by: mansoor-agent-hub-gemini-cli -->';
const stateName = '.mansoor-agent-hub-managed.json';
if (!geminiRoot) throw new Error('Cannot determine user home; set USERPROFILE or GEMINI_CLI_HOME.');
if (args.some((arg) => !['--check'].includes(arg))) throw new Error('Usage: node tools/install-gemini-cli-team.mjs [--check]');

function hasProfiles(directory) {
  if (!fs.existsSync(directory)) return false;
  return fs.readdirSync(directory, { withFileTypes: true }).some((entry) => entry.isFile() && entry.name.endsWith('.md')
    || entry.isDirectory() && fs.existsSync(path.join(directory, entry.name, 'agent.md')));
}

function hasSkills(directory) {
  if (!fs.existsSync(directory)) return false;
  return fs.readdirSync(directory, { withFileTypes: true }).some((entry) => entry.isDirectory() && fs.existsSync(path.join(directory, entry.name, 'SKILL.md')));
}

export function discoverTeamSources(baseRoot = root) {
  const agentCandidates = [
    path.join(baseRoot, 'agents', 'Antigravity', 'custom-agents'),
    path.join(baseRoot, 'agents'),
  ];
  const agents = agentCandidates.find(hasProfiles);
  const skillCandidates = [path.join(baseRoot, 'skill-library'), path.join(baseRoot, 'skills')];
  const skills = skillCandidates.find(hasSkills);
  const rules = path.join(baseRoot, 'rules');
  if (!agents || !skills || !fs.existsSync(rules)) throw new Error(`Mansoor team sources were not found under ${baseRoot}.`);
  return { agents, skills, rules };
}

function frontmatterOf(source, label) {
  const clean = source.replace(/^\uFEFF/, '');
  const match = clean.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`${label} has no YAML frontmatter.`);
  return { frontmatter: match[1], body: match[2] };
}

function yamlValue(frontmatter, key, fallback = '') {
  return frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim().replace(/^['"]|['"]$/g, '') || fallback;
}

function skillsFromFrontmatter(frontmatter) {
  const section = frontmatter.match(/^skills:\s*\r?\n((?:[ \t]+-[^\r\n]*(?:\r?\n|$))*)/m)?.[1] || '';
  return [...section.matchAll(/^\s*-\s*skills\/([^\s]+)\s*$/gm)].map((match) => match[1]);
}

export function convertAgentProfile(source, { slug, isManager = false }) {
  const { frontmatter, body: rawBody } = frontmatterOf(source, `Agent profile ${slug}`);
  const name = isManager ? 'Mansoor AI Team Manager' : yamlValue(frontmatter, 'name', slug);
  const description = (isManager
    ? 'Primary manager for coordinating the Mansoor AI Team and delegating focused specialists.'
    : yamlValue(frontmatter, 'description', `${name} specialist`)).replace(/\s+/g, ' ');
  const packagedSkills = rawBody.match(/Relevant bundled skill names:\s*([^\r\n]*)/i)?.[1]?.trim();
  const sourceSkillRefs = skillsFromFrontmatter(frontmatter);
  const skillRefs = sourceSkillRefs.length
    ? sourceSkillRefs
    : (packagedSkills ? packagedSkills.split(',').map((skill) => skill.trim().replace(/^skills\//, '')).filter(Boolean) : []);
  let body = rawBody.trim()
    .replaceAll('production-orchestrator', 'Mansoor AI Team Manager')
    .replaceAll('invoke_subagent', 'recursive subagent invocation')
    .replaceAll('Antigravity runtime', 'Gemini CLI runtime')
    .replaceAll('Antigravity', 'Gemini CLI')
    .replaceAll('Use Gemini CLI recursive subagent invocation.', 'Delegate work to the parent Gemini CLI session; do not attempt recursive subagent calls.')
    .replace(/^Internal routing id:.*\r?\n/gm, '')
    .replace(/You are Mansoor AI Team Manager[\s\S]*?(?=\n## |$)/, 'You are Mansoor AI Team Manager, the primary coordinator for this session. Delegate through the parent Gemini CLI session; do not attempt recursive subagent calls.');
  for (const skill of skillRefs) body = body.replaceAll(`skills/${skill}`, `mam-${skill}`);
  if (isManager) body = `You are Mansoor AI Team Manager, the primary coordinator for this session. Delegate through the parent Gemini CLI session; do not attempt recursive subagent calls.\n\n${body}`;
  if (skillRefs.length) body += `\n\n## Gemini CLI team skills\n\nActivate the matching on-demand team skills when they fit the task: ${skillRefs.map((skill) => `mam-${skill}`).join(', ')}.`;
  return `---\nname: ${slug}\ndescription: ${description}\nkind: local\nmodel: inherit\nmax_turns: 12\n---\n${marker}\n${body}\n`;
}

export function convertSkillProfile(source, { directoryName }) {
  const { frontmatter, body } = frontmatterOf(source, `Skill ${directoryName}`);
  const name = yamlValue(frontmatter, 'name', directoryName);
  const description = yamlValue(frontmatter, 'description');
  if (!name || !description) throw new Error(`Skill ${directoryName} must define name and description frontmatter.`);
  const namespaced = `mam-${directoryName}`;
  const renamed = frontmatter.replace(/^name:\s*.*$/m, `name: ${namespaced}`);
  return `---\n${renamed}\n---\n${marker}\n${body}`;
}

export function convertRuleProfile(source, { fileName }) {
  const { frontmatter, body } = frontmatterOf(source, `Policy ${fileName}`);
  const description = yamlValue(frontmatter, 'description');
  if (!description) throw new Error(`Policy ${fileName} must define a description.`);
  const slug = path.basename(fileName, '.md');
  return `---\nname: mam-policy-${slug}\ndescription: ${description.replace(/\s+/g, ' ')}\n---\n${marker}\n${body}`;
}

export function managerInstructions(existing) {
  const block = `<!-- mansoor-ai-team-manager:start -->\n## Mansoor AI Team Manager\n\nThe primary agent identity for this Gemini CLI session is **Mansoor AI Team Manager**. This is the user's main agent; any older routing slug is an internal compatibility detail only. Apply the Mansoor team policies from this instruction and delegate bounded work to the registered \`mam-*\` specialists when the work is independent and useful. Use no more than three concurrent specialists, assign one writer per file/path, and prefer a read-only verifier for independent review. Keep progress updates brief and report only checks actually run.\n\nThe full Mansoor team skill library and four domain policies are installed globally as \`mam-*\` skills and load on demand. Use matching \`mam-policy-*\` skills for architecture, Flutter/mobile, SaaS, and live-testing work. Skills may ask for first-use consent according to Gemini CLI policy. Keep the selected model inherited from the Gemini CLI session. Do not route to DeepSeek, Hermes, API-key pools, cloud bridges or external model fallbacks. Follow the host approval mode; do not use YOLO mode or bypass approvals.\n\nThe signed Agent Hub installer syncs the latest team profiles, skills and policies from its package. In the source checkout, use \`npm run agents:install:gemini\`.\n<!-- mansoor-ai-team-manager:end -->`;
  let out = existing.replace(/<!-- mansoor-ai-team-manager:start -->[\s\S]*?<!-- mansoor-ai-team-manager:end -->\s*/g, '');
  out = out.replace(/<!-- agents-hub-manager-routing -->[\s\S]*?<!-- \/agents-hub-manager-routing -->\s*/g, '');
  out = out.replace(/<!-- agents-hub-context -->[\s\S]*?<!-- \/agents-hub-context -->\s*/g, '');
  const oldPolicy = /## Autonomous Multi-Agent & Language Protocol[\s\S]*?(?=<!-- context7 -->)/;
  if (oldPolicy.test(out)) out = out.replace(oldPolicy, `${block}\n\n`);
  else if (out.includes('<!-- context7 -->')) out = out.replace('<!-- context7 -->', `${block}\n\n<!-- context7 -->`);
  else out = `${out.trimEnd()}\n\n${block}\n`;
  return out;
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function walkFiles(directory, base = directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing symbolic link in a team skill: ${file}`);
    if (entry.isDirectory()) walkFiles(file, base, result);
    else if (entry.isFile()) result.push({ file, relative: path.relative(base, file) });
  }
  return result;
}

function sourceAgents(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Refusing symbolic link in a team profile directory: ${entry.name}`);
    if (entry.isFile() && entry.name.endsWith('.md')) result.push({ folder: path.basename(entry.name, '.md'), source: fs.readFileSync(path.join(directory, entry.name), 'utf8') });
    else if (entry.isDirectory()) {
      const profile = path.join(directory, entry.name, 'agent.md');
      if (fs.existsSync(profile)) result.push({ folder: entry.name, source: fs.readFileSync(profile, 'utf8') });
    }
  }
  return result.map((agent) => ({ ...agent, manager: /^name:\s*Mansoor AI Team Manager\s*$/m.test(frontmatterOf(agent.source, agent.folder).frontmatter) }));
}

function atomicWrite(file, contents) {
  const bytes = Buffer.isBuffer(contents) ? contents : Buffer.from(contents, 'utf8');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    const current = fs.readFileSync(file);
    if (current.equals(bytes)) return;
    const text = current.toString('utf8');
    if (file.endsWith('.md') && !text.includes(marker) && !file.endsWith('GEMINI.md')) {
      throw new Error(`Refusing to overwrite an unmanaged Gemini profile or skill: ${file}`);
    }
    const backup = `${file}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    fs.copyFileSync(file, backup);
  }
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, bytes);
  fs.renameSync(tmp, file);
}

function loadState(file) {
  if (!fs.existsSync(file)) return null;
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (state?.schema !== 'mansoor-gemini-sync/v1' || !Array.isArray(state.files)) throw new Error(`Invalid Mansoor Gemini sync state: ${file}`);
  return state;
}

function pruneStaleManaged(previous, currentPaths, target) {
  if (!previous) return [];
  const current = new Set(currentPaths);
  const preserved = [];
  const old = previous.files.filter((entry) => !current.has(String(entry.path || '').replaceAll('\\', '/')));
  const allManagedSkills = new Map();
  for (const entry of previous.files) {
    const relative = String(entry.path || '').replaceAll('\\', '/');
    const skillMatch = relative.match(/^(skills\/mam-[a-z0-9._-]+)\//i);
    if (!skillMatch) continue;
    if (!allManagedSkills.has(skillMatch[1])) allManagedSkills.set(skillMatch[1], []);
    allManagedSkills.get(skillMatch[1]).push(entry);
  }
  for (const entry of old) {
    const relative = String(entry.path || '').replaceAll('\\', '/');
    if (/^skills\/mam-[a-z0-9._-]+\//i.test(relative)) continue;
    if (!/^agents\/(?:mam-[a-z0-9._-]+|mansoor-ai-team-manager)\.md$/i.test(relative)) continue;
    const file = path.resolve(target, relative);
    if (!file.startsWith(`${path.resolve(target)}${path.sep}`) || !fs.existsSync(file)) continue;
    const bytes = fs.readFileSync(file);
    if (sha256(bytes) !== entry.sha256 || !bytes.toString('utf8').includes(marker)) preserved.push(relative);
    else fs.unlinkSync(file);
  }
  for (const [directory, entries] of allManagedSkills) {
    const absolute = path.resolve(target, directory);
    if (!absolute.startsWith(`${path.resolve(target)}${path.sep}`) || !fs.existsSync(absolute)) continue;
    const skillFile = path.join(absolute, 'SKILL.md');
    const managed = fs.existsSync(skillFile) && fs.readFileSync(skillFile, 'utf8').includes(marker);
    const directoryIsCurrent = currentPaths.some((relative) => relative.startsWith(`${directory}/`));
    if (directoryIsCurrent) {
      if (!managed) { preserved.push(directory); continue; }
      for (const entry of old.filter((item) => String(item.path || '').replaceAll('\\', '/').startsWith(`${directory}/`))) {
        const relative = String(entry.path).replaceAll('\\', '/');
        const file = path.resolve(target, relative);
        if (!fs.existsSync(file)) continue;
        if (sha256(fs.readFileSync(file)) === entry.sha256) fs.unlinkSync(file);
        else preserved.push(relative);
      }
      continue;
    }
    let actual;
    try { actual = walkFiles(absolute).map((item) => ({ path: path.relative(target, item.file).replaceAll('\\', '/'), sha256: sha256(fs.readFileSync(item.file)) })).sort((a, b) => a.path.localeCompare(b.path)); }
    catch { preserved.push(directory); continue; }
    const expected = entries.map((entry) => ({ path: String(entry.path).replaceAll('\\', '/'), sha256: entry.sha256 })).sort((a, b) => a.path.localeCompare(b.path));
    if (managed && JSON.stringify(actual) === JSON.stringify(expected)) fs.rmSync(absolute, { recursive: true, force: true });
    else preserved.push(directory);
  }
  return preserved;
}

function pruneManagedBackups(directory) {
  if (!fs.existsSync(directory)) return;
  const groups = new Map();
  const skillsRoot = path.basename(directory).toLowerCase() === 'skills';
  const visit = (current, managedSkill = false) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (skillsRoot && entry.name.startsWith('mam-')) visit(file, true);
        continue;
      }
      if (!entry.isFile()) continue;
      const match = entry.name.match(/^(.*\.(?:md|json))\.bak-(\d{4}-\d{2}-\d{2}T.*)$/i);
      if (!match || (!managedSkill && !/^(?:mam-[a-z0-9._-]+|mansoor-ai-team-manager)\./i.test(match[1]))) continue;
      if (!groups.has(match[1])) groups.set(match[1], []);
      groups.get(match[1]).push({ file, timestamp: match[2] });
    }
  };
  visit(directory);
  for (const backups of groups.values()) {
    backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    for (const item of backups.slice(1)) fs.unlinkSync(item.file);
  }
}

function skillPayloads(directory, rulesDirectory) {
  const skills = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const sourceDir = path.join(directory, entry.name);
      const files = walkFiles(sourceDir).map(({ file, relative }) => {
        const source = fs.readFileSync(file);
        const contents = relative === 'SKILL.md' ? Buffer.from(convertSkillProfile(source.toString('utf8'), { directoryName: entry.name }), 'utf8') : source;
        return { relative, contents };
      });
      if (!files.some((file) => file.relative === 'SKILL.md')) throw new Error(`Skill ${entry.name} is missing SKILL.md.`);
      return { name: `mam-${entry.name}`, files };
    });
  const rules = fs.readdirSync(rulesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => {
      const file = path.join(rulesDirectory, entry.name);
      return { name: `mam-policy-${path.basename(entry.name, '.md')}`, files: [{ relative: 'SKILL.md', contents: Buffer.from(convertRuleProfile(fs.readFileSync(file, 'utf8'), { fileName: entry.name }), 'utf8') }] };
    });
  return [...skills, ...rules];
}

export function syncGeminiTeam({ baseRoot = root, source, skills, rules, target = geminiRoot, check = false } = {}) {
  const discovered = discoverTeamSources(baseRoot);
  const agentSource = source || discovered.agents;
  const skillSource = skills || discovered.skills;
  const ruleSource = rules || discovered.rules;
  const agents = sourceAgents(agentSource);
  if (agents.length !== 15 || agents.filter((agent) => agent.manager).length !== 1) throw new Error(`Expected 15 source profiles and exactly one Mansoor manager; found ${agents.length}.`);
  const skillsToInstall = skillPayloads(skillSource, ruleSource);
  if (skillsToInstall.length !== 183) throw new Error(`Expected 179 source skills and 4 domain policies; found ${skillsToInstall.length} entries.`);
  const agentDir = path.join(target, 'agents');
  const skillDir = path.join(target, 'skills');
  const outputs = agents.map((agent) => {
    const slug = agent.manager ? 'mansoor-ai-team-manager' : `mam-${agent.folder}`;
    return { path: `agents/${slug}.md`, contents: Buffer.from(convertAgentProfile(agent.source, { slug, isManager: agent.manager }), 'utf8') };
  });
  const skillOutputs = skillsToInstall.flatMap((skill) => skill.files.map((file) => ({
    path: `skills/${skill.name}/${file.relative}`,
    contents: file.contents,
  })));
  const allOutputs = [...outputs, ...skillOutputs];
  const expectedState = {
    schema: 'mansoor-gemini-sync/v1',
    manager: 'Mansoor AI Team Manager',
    files: allOutputs.map((item) => ({ path: item.path, sha256: sha256(item.contents) })).sort((a, b) => a.path.localeCompare(b.path)),
  };
  const stateFile = path.join(target, stateName);
  const previousState = loadState(stateFile);
  const geminiFile = path.join(target, 'GEMINI.md');
  const geminiContents = managerInstructions(fs.existsSync(geminiFile) ? fs.readFileSync(geminiFile, 'utf8') : '');
  const installedFilesMatch = allOutputs.every((item) => {
    const file = path.join(target, item.path);
    return fs.existsSync(file) && fs.readFileSync(file).equals(item.contents);
  });
  const stateMatches = previousState && JSON.stringify(previousState) === JSON.stringify(expectedState);
  const instructionsMatch = fs.existsSync(geminiFile) && fs.readFileSync(geminiFile, 'utf8') === geminiContents;
  if (check) {
    if (!installedFilesMatch || !stateMatches || !instructionsMatch) throw new Error(`Gemini CLI Mansoor team is out of sync: ${outputs.length} profiles, ${skillsToInstall.length} skills; run the bundled installer.`);
    return `Gemini CLI Mansoor team is current: ${outputs.length} agent profiles, 179 skills, 4 domain policies and global manager instructions.`;
  }

  fs.mkdirSync(agentDir, { recursive: true });
  fs.mkdirSync(skillDir, { recursive: true });
  pruneStaleManaged(previousState, allOutputs.map((item) => item.path), target);
  for (const item of allOutputs) atomicWrite(path.join(target, item.path), item.contents);
  atomicWrite(geminiFile, geminiContents);
  atomicWrite(stateFile, `${JSON.stringify(expectedState, null, 2)}\n`);
  return `Installed Mansoor AI Team Manager, ${outputs.length - 1} specialists, 179 full skills and 4 domain policies in ${target}.`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    console.log(syncGeminiTeam({ check: checkOnly }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
