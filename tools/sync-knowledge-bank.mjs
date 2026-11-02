import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const projectIdx = args.indexOf('--project');
const dirIdx = args.indexOf('--dir');
const pushFlag = args.includes('--push');

const projectName = projectIdx !== -1 ? args[projectIdx + 1] : 'sample-project';
const projectDir = dirIdx !== -1 ? path.resolve(args[dirIdx + 1]) : process.cwd();

const hubDir = path.resolve(import.meta.dirname, '..');
const dossiersDir = path.join(hubDir, 'shared', 'knowledge', 'datasets', 'project-dossiers');

fs.mkdirSync(dossiersDir, { recursive: true });

// Secret and token scrubbers
const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/g,
  /sk-[a-zA-Z0-9]{20,}/g,
  /ghp_[a-zA-Z0-9]{30,}/g,
  /(?:password|passwd|pwd|secret|apiKey|api_key|token)\s*[:=]\s*["']?([^\s"';]+)["']?/gi,
  /postgres:\/\/[^@]+@/g,
  /mysql:\/\/[^@]+@/g,
  /mongodb(?:\+srv)?:\/\/[^@]+@/g
];

function sanitizeContent(raw) {
  let cleaned = raw;
  for (const pattern of SECRET_PATTERNS) {
    cleaned = cleaned.replace(pattern, (match, p1) => {
      if (p1) return match.replace(p1, '[REDACTED_SECRET]');
      return '[REDACTED_SECRET]';
    });
  }
  return cleaned;
}

console.log(`[Knowledge Sync] Harvesting project '${projectName}' from '${projectDir}'...`);

const candidateFiles = [
  'PROJECT_FLOWS.md',
  'WORKSTYLE.md',
  'SCHEMA.md',
  'ARCHITECTURE.md',
  'README.md',
  'package.json'
];

let collectedSections = [];

if (fs.existsSync(projectDir)) {
  for (const file of candidateFiles) {
    const fullPath = path.join(projectDir, file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const sanitized = sanitizeContent(content.slice(0, 5000));
        collectedSections.push(`### Source: ${file}\n\n\`\`\`markdown\n${sanitized}\n\`\`\`\n`);
      } catch (err) {
        console.warn(`[Knowledge Sync] Could not read ${file}: ${err.message}`);
      }
    }
  }
}

const dossierPath = path.join(dossiersDir, `${projectName}.md`);
const dossierContent = `# Project Knowledge Dossier: ${projectName}

- **Captured Date**: ${new Date().toISOString()}
- **Origin**: ${projectName}
- **Sanitized Status**: SECRETS_SCRUBBED (Production Safe)

---

## 1. Architectural Summary & Patterns

${collectedSections.length > 0 ? collectedSections.join('\n\n') : '*No matching project instruction files found.*'}

---

## 2. Invariants & Lessons Learned
- Auto-harvested from Antigravity session.
- Safe for cross-agent consumption and multi-agent training.
`;

fs.writeFileSync(dossierPath, dossierContent, 'utf8');
console.log(`[Knowledge Sync] Saved sanitized dossier to ${dossierPath}`);

// If --push requested and git is initialized
if (pushFlag) {
  try {
    console.log('[Knowledge Sync] Staging and pushing to private Git origin...');
    execSync('git add shared/knowledge/datasets/project-dossiers', { cwd: hubDir, stdio: 'inherit' });
    execSync(`git commit -m "chore(knowledge): harvest sanitized dossier for ${projectName}"`, { cwd: hubDir, stdio: 'inherit' });
    execSync('git push origin main', { cwd: hubDir, stdio: 'inherit' });
    console.log('[Knowledge Sync] Git push complete.');
  } catch (err) {
    console.warn(`[Knowledge Sync] Git push skipped or failed: ${err.message}`);
  }
}
