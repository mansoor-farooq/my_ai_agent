import { chmod, cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const validRuleTriggers = new Set(['always_on', 'model_decision', 'glob', 'manual']);
const importedSkillNames = new Set([
  'android-design', 'flutter-ui-ux', 'flutter-ui-ux-engineer', 'mobile-ui-ux-designer',
  'bigquery-observability', 'bigquery-optimization', 'bigquery-troubleshooting',
  'cloud-databases-onboarding', 'create-plan', 'gcp-spark-observability',
  'gh-address-comments', 'gh-fix-ci', 'mansoor-ui-specialist', 'memory',
  'omniroute-gateway', 'stop-slop',
]);
const portableTextExtensions = new Set([
  '', '.cfg', '.cmd', '.conf', '.css', '.html', '.ini', '.js', '.json', '.jsx',
  '.md', '.mjs', '.ps1', '.py', '.sh', '.toml', '.ts', '.txt', '.xml', '.yaml', '.yml',
]);

export const requiredPortableSupportFiles = [
  'skills/impeccable/agents/impeccable_asset_producer.toml',
  'skills/impeccable/agents/impeccable_documenter.toml',
  'skills/impeccable/agents/impeccable_finish_reviewer.toml',
  'skills/impeccable/agents/impeccable_manual_edit_applier.toml',
  'skills/impeccable/agents/openai.yaml',
  'skills/frontend-design/LICENSE',
  'skills/frontend-design/assets/vanilla-starter/index.html',
  'skills/frontend-design/assets/vanilla-starter/script.js',
  'skills/frontend-design/assets/vanilla-starter/style.css',
  'skills/frontend-design/references/aesthetic-playbook.md',
  'skills/frontend-design/references/implementation-patterns.md',
  'skills/project-context-orchestrator/agents/openai.yaml',
];

async function directoryEntries(directory) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function walkFiles(directory, files = []) {
  for (const entry of await directoryEntries(directory)) {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Portable component cannot contain a symbolic link: ${full}`);
    if (entry.isDirectory()) await walkFiles(full, files);
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function portablePathIssue(root, file) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (/(?:^|\/)(?:\.git|node_modules|native-profile|private-backup|conversations?|chats?|mcpservers?|sidecars?|hooks)(?:\/|$)/i.test(relative)) return relative;
  if (/(?:^|\/)(?:\.env(?:\..*)?|[^/]+\.(?:pem|key|p12|pfx|db|sqlite|zip))$/i.test(relative)) return relative;
  return null;
}

function ruleTrigger(markdown) {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return frontmatter?.[1].match(/^trigger:\s*([^\r\n]+)\s*$/m)?.[1]?.trim();
}


function compactSkillRouter(markdown, name) {
  const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) throw new Error('Skill has no frontmatter: ' + name);
  const frontmatter = frontmatterMatch[1];
  const nameMatch = frontmatter.match(/^name:\s*([^\r\n]+)$/m);
  const licenseMatch = frontmatter.match(/^license:\s*([^\r\n]+)$/m);
  const sourceMatch = frontmatter.match(/^(?:author|source|source_repo|source_url):\s*([^\r\n]+)$/m);
  const descriptionMatch = frontmatter.match(/^description:\s*([\s\S]*?)(?=^[A-Za-z0-9_-]+:|^---\s*$)/m);
  const description = (descriptionMatch?.[1] ?? name).replace(/^>[-+]?\s*/m, '').replace(/\r?\n[ \t]+/g, ' ').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().replace(/^['"]|['"]$/g, '').slice(0, 60).replace(/[,:;. ]?\s*$/, '');
  const lines = [
    '---',
    'name: ' + (nameMatch?.[1]?.trim() ?? name),
    'description: ' + JSON.stringify(description + '. Use when the task matches this skill.'),
  ];
  lines.push('---', '', 'Read full instructions at ../skill-library/' + name + '/SKILL.md when selected.', '');
  return lines.join('\n');
}
export async function inspectPortableSource(root) {
  const skillsRoot = path.join(root, 'skills');
  const rulesRoot = path.join(root, 'rules');
  const skillDirectories = (await directoryEntries(skillsRoot)).filter((entry) => entry.isDirectory());
  const ruleFiles = (await directoryEntries(rulesRoot)).filter((entry) => entry.isFile() && entry.name.endsWith('.md'));
  const skills = [];
  const invalidSkills = [];
  const skillsWithoutProvenance = [];
  const brokenLocalReferences = [];
  for (const entry of skillDirectories) {
    try {
      const content = (await readFile(path.join(skillsRoot, entry.name, 'SKILL.md'), 'utf8')).replace(/^\uFEFF/, '');
      if (!/^---\r?\n[\s\S]*?^name:\s*[^\r\n]+/m.test(content)) invalidSkills.push(entry.name);
      else {
        skills.push(entry.name);
        const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
        if (!/^license:\s*[^\r\n]+/m.test(frontmatter) || !/^(?:author|source|source_repo|source_url):\s*[^\r\n]+/m.test(frontmatter)) {
          skillsWithoutProvenance.push(entry.name);
        }
        for (const match of content.matchAll(/(?:\.\.\/)+references\/[A-Za-z0-9._/-]+\.md/g)) {
          const resolved = path.resolve(path.dirname(path.join(skillsRoot, entry.name, 'SKILL.md')), match[0]);
          try { await readFile(resolved); } catch { brokenLocalReferences.push(`${entry.name}:${match[0]}`); }
        }
      }
    } catch {
      invalidSkills.push(entry.name);
    }
  }
  const rules = [];
  const invalidRules = [];
  for (const entry of ruleFiles) {
    const content = (await readFile(path.join(rulesRoot, entry.name), 'utf8')).replace(/^\uFEFF/, '');
    const trigger = ruleTrigger(content);
    if (!validRuleTriggers.has(trigger)) invalidRules.push(entry.name);
    else rules.push(entry.name);
  }
  const allPortableFiles = [
    ...await walkFiles(skillsRoot),
    ...await walkFiles(rulesRoot),
  ];
  const nestedSkillFiles = allPortableFiles
    .filter((file) => path.basename(file) === 'SKILL.md' && path.relative(skillsRoot, file).split(path.sep).length !== 2)
    .map((file) => path.relative(root, file).replaceAll('\\', '/'))
    .sort();
  const unsafePaths = allPortableFiles.map((file) => portablePathIssue(root, file)).filter(Boolean).sort();
  const provenanceGaps = skillsWithoutProvenance.filter((name) => importedSkillNames.has(name)).sort();

  return {
    skills: skills.sort(),
    rules: rules.sort(),
    invalidSkills: invalidSkills.sort(),
    invalidRules: invalidRules.sort(),
    nestedSkillFiles,
    unsafePaths,
    brokenLocalReferences: [...new Set(brokenLocalReferences)].sort(),
    skillsWithoutProvenance: skillsWithoutProvenance.sort(),
    provenanceGaps,
  };
}

export async function readAgentSkillReferences(root) {
  const agentsRoot = path.join(root, 'agents', 'Antigravity', 'custom-agents');
  const references = [];
  for (const entry of await directoryEntries(agentsRoot)) {
    if (!entry.isDirectory()) continue;
    let content;
    try {
      content = await readFile(path.join(agentsRoot, entry.name, 'agent.md'), 'utf8');
    } catch {
      continue;
    }
    const block = content.match(/^skills:\r?\n((?:[ \t]+-[^\r\n]*\r?\n?)+)/m)?.[1] ?? '';
    for (const match of block.matchAll(/^\s+-\s+(.+?)\s*$/gm)) {
      references.push(match[1].replace(/^skills\//, ''));
    }
  }
  return references;
}

export async function copyPortableComponents(root, target, credentialPattern) {
  const inventory = await inspectPortableSource(root);
  if (inventory.invalidSkills.length) throw new Error(`Invalid portable skills: ${inventory.invalidSkills.join(', ')}`);
  if (inventory.invalidRules.length) throw new Error(`Invalid portable rules: ${inventory.invalidRules.join(', ')}`);
  if (inventory.nestedSkillFiles.length) throw new Error(`Nested duplicate skill bodies are not portable: ${inventory.nestedSkillFiles.join(', ')}`);
  if (inventory.unsafePaths.length) throw new Error(`Unsafe portable component paths: ${inventory.unsafePaths.join(', ')}`);
  if (inventory.brokenLocalReferences.length) throw new Error(`Broken local skill references: ${inventory.brokenLocalReferences.join(', ')}`);
  if (inventory.provenanceGaps.length) throw new Error(`Imported skills are missing provenance/licence metadata: ${inventory.provenanceGaps.join(', ')}`);

  const references = await readAgentSkillReferences(root);
  const missing = [...new Set(references.filter((name) => !inventory.skills.includes(name)))].sort();
  if (missing.length) throw new Error(`Agent skill references have no portable body: ${missing.join(', ')}`);

  for (const componentRoot of [path.join(root, 'skills'), path.join(root, 'rules')]) {
    for (const file of await walkFiles(componentRoot)) {
      if (!portableTextExtensions.has(path.extname(file).toLowerCase())) continue;
      const text = await readFile(file, 'utf8');
      if (credentialPattern?.test(text)) throw new Error(`Credential-like value detected in portable component: ${path.relative(root, file)}`);
      if (credentialPattern?.global) credentialPattern.lastIndex = 0;
    }
  }

  await mkdir(target, { recursive: true });
  await cp(path.join(root, 'skills'), path.join(target, 'skill-library'), { recursive: true, errorOnExist: true });
  await cp(path.join(root, 'skills'), path.join(target, 'skills'), { recursive: true, errorOnExist: true });
  for (const name of inventory.skills) {
    const source = path.join(root, 'skills', name, 'SKILL.md');
    const destination = path.join(target, 'skills', name, 'SKILL.md');
    const original = (await readFile(source, 'utf8')).replace(/^\uFEFF/, '');
    await chmod(destination, 0o644);
    await writeFile(destination, compactSkillRouter(original, name));
  }
  await cp(path.join(root, 'rules'), path.join(target, 'rules'), { recursive: true, errorOnExist: true });
  const missingSupportFiles = [];
  for (const relative of requiredPortableSupportFiles) {
    try { await readFile(path.join(target, relative)); } catch { missingSupportFiles.push(relative); }
  }
  if (missingSupportFiles.length) throw new Error(`Required portable skill support files were not copied: ${missingSupportFiles.join(', ')}`);
  return { skillCount: inventory.skills.length, ruleCount: inventory.rules.length };
}
