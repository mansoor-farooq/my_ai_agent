import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const projectDir = path.resolve(value('--dir', process.cwd()));
const projectName = value('--project', path.basename(projectDir));
const contributor = value('--contributor', '');
const explicitGitUrl = value('--git-url', '');
const phase = value('--phase', 'planning');
const safePhase = phase.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'planning';
const round = value('--round', new Date().toISOString().replace(/[:.]/g, '-'));
const shouldPush = args.includes('--push');
const dryRun = args.includes('--dry-run');
if (!fs.existsSync(projectDir)) throw new Error(`Project directory does not exist: ${projectDir}`);

const hubDir = path.resolve(import.meta.dirname, '..');
const slugify = (input, fallback) => input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || fallback;
const slug = slugify(projectName, 'project');
function readGitConfig(key) { const result = spawnSync('git', ['config', '--get', key], { cwd: projectDir, encoding: 'utf8', windowsHide: true }); return result.status === 0 ? result.stdout.trim() : ''; }
function sanitizeGitUrl(raw) { if (!raw) return ''; try { const url = new URL(raw.replace(/^git@([^:]+):/, 'ssh://git@$1/')); url.username = url.username === 'git' ? 'git' : ''; url.password = ''; return url.toString().replace(/\/$/, ''); } catch { return raw.replace(/:\/\/[^@]+@/, '://').replace(/\.git$/, '') + (raw.endsWith('.git') ? '.git' : ''); } }
const gitUrl = sanitizeGitUrl(explicitGitUrl || readGitConfig('remote.origin.url'));
const contributorName = contributor || readGitConfig('user.name') || 'contributor';
const contributorSlug = slugify(contributorName, 'contributor');
const projectId = crypto.createHash('sha256').update(`${gitUrl.toLowerCase()}|${slug}`).digest('hex').slice(0, 8);
const branch = `knowledge/${contributorSlug}/${slug}-${projectId}`;
const safeRound = round.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'round';
function git(gitArgs, cwd, allowFailure = false) { const result = spawnSync('git', gitArgs, { cwd, encoding: 'utf8', windowsHide: true }); if (result.status !== 0 && !allowFailure) throw new Error((result.stderr || result.stdout || 'git failed').trim()); return result; }
function hasGitRef(ref, cwd = hubDir) { return git(['rev-parse', '--verify', ref], cwd, true).status === 0; }

const SECRET_FILES = /(^|[\\/])(\.env(?:\..*)?|.*\.(pem|key|p12|pfx|secret|credentials?|token))$/i;
const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z_-]{35}/g,
  /(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{16,}/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /((?:password|passwd|pwd|secret|apiKey|api_key|access[_-]?token|refresh[_-]?token|authorization)\s*[:=]\s*["']?)([^\s"';,}]+)/gi,
  /(postgres|mysql|mongodb(?:\+srv)?:\/\/)[^\s"']+/gi,
];
function sanitize(raw) { let result = raw; for (const pattern of SECRET_PATTERNS) result = result.replace(pattern, (...m) => (m.length > 2 && typeof m[1] === 'string') ? `${m[1]}[REDACTED_SECRET]` : '[REDACTED_SECRET]'); return result; }
function shouldSkip(relative) { return SECRET_FILES.test(relative) || /(^|[\\/])(node_modules|\.git|build|dist|coverage|\.next|\.dart_tool)([\\/]|$)/i.test(relative); }
function walk(dir, relative = '') { const output = []; for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const child = path.join(relative, entry.name); if (shouldSkip(child)) continue; const absolute = path.join(dir, entry.name); if (entry.isDirectory()) output.push(...walk(absolute, child)); else output.push(child.replaceAll(path.sep, '/')); if (output.length >= 20000) break; } return output; }
function readSafe(relative) { if (shouldSkip(relative)) return ''; try { const full = path.join(projectDir, relative); const stat = fs.statSync(full); if (!stat.isFile() || stat.size > 200_000) return ''; return sanitize(fs.readFileSync(full, 'utf8').slice(0, 20_000)); } catch { return ''; } }

const files = walk(projectDir);
const preferred = files.filter((file) => /(^|\/)(AGENTS?\.md|GEMINI.*\.md|README.*\.md|PROJECT_.*\.md|WORKSTYLE\.md|SCHEMA.*\.md|ARCHITECTURE.*\.md|PRODUCT_.*\.md|PLAN\.md|FLOW\.md|UNDERSTANDING\.md|DECISIONS\.md|EVIDENCE\.md|RESEARCH\.md|PROMPT_LEDGER\.md|CONVERSATIONS\.md|API_CONTRACTS\.md|DATA_MODEL\.md|TECH_STACK\.md|AGENT_EXPORT_POLICY\.md|package\.json|pubspec\.yaml|pyproject\.toml|Cargo\.toml|go\.mod|tsconfig.*\.json)$/i.test(file));
const sourceFiles = [...new Set(preferred)].slice(0, 80);
const sections = sourceFiles.map((relative) => { const content = readSafe(relative); return content ? `### Source: ${relative}\n\n\`\`\`text\n${content}\n\`\`\`\n` : ''; }).filter(Boolean);
const tree = files.slice(0, 20000).map((file) => `- ${file}`).join('\n');
const capturedAt = new Date().toISOString();
const dossier = `# Project Knowledge Dossier: ${projectName}\n\n- Captured: ${capturedAt}\n- Contributor: ${contributorName}\n- Project ID: ${projectId}\n- Git URL: ${gitUrl || 'not provided'}\n- Phase: ${safePhase}\n- Round: ${round}\n- Sanitized: yes\n- Source path: omitted from stored dossier\n\n## Source inventory\n\n${tree || '- No readable files found.'}\n\n## Verified project instructions and entry metadata\n\n${sections.join('\n') || '- No approved metadata files found.'}\n\n## Agent contract\n\nThis dossier is historical project context. Read the current repository and project instructions before changing code. Preserve existing routes, APIs, data contracts, permissions, state transitions and tests unless the owner explicitly changes them.\n`;
const metadata = JSON.stringify({ schemaVersion: 1, project: projectName, projectId, contributor: contributorName, branch, gitUrl: gitUrl || null, phase: safePhase, round, capturedAt, fileCount: files.length, sourceFiles: sourceFiles.length, secrets: 'scrubbed-or-excluded', hiddenReasoning: 'not-exported' }, null, 2) + '\n';
if (dryRun) { console.log(JSON.stringify({ project: projectName, projectId, contributor: contributorName, branch, gitUrl: gitUrl || null, phase: safePhase, round, fileCount: files.length, sourceFiles: sourceFiles.length, pushed: false, dryRun: true })); process.exit(0); }

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-knowledge-'));
const worktree = path.join(tempRoot, 'repo');
try {
  git(['clone', '--no-hardlinks', hubDir, worktree], tempRoot);
  git(['fetch', 'origin', 'main', branch], worktree, true);
  const base = hasGitRef(`origin/${branch}`, worktree) ? `origin/${branch}` : (hasGitRef('origin/main', worktree) ? 'origin/main' : 'HEAD');
  git(['checkout', '--detach', base], worktree);
  const destination = path.join(worktree, 'shared', 'knowledge', 'project-branches', contributorSlug, `${slug}-${projectId}`);
  const roundsDir = path.join(destination, 'rounds');
  fs.mkdirSync(roundsDir, { recursive: true });
  fs.writeFileSync(path.join(destination, 'PROJECT_DOSSIER.md'), dossier, 'utf8');
  fs.writeFileSync(path.join(destination, 'manifest.json'), metadata, 'utf8');
  fs.writeFileSync(path.join(roundsDir, `${safeRound}-${safePhase}.md`), dossier, 'utf8');
  git(['add', path.relative(worktree, destination)], worktree);
  if (!git(['status', '--short'], worktree).stdout.trim()) { console.log(JSON.stringify({ project: projectName, branch, phase, round, changed: false, pushed: false })); process.exit(0); }
  git(['commit', '-m', `knowledge: ${contributorSlug}/${slug}-${projectId} ${safePhase} ${safeRound}`], worktree);
  if (shouldPush) git(['push', 'origin', `HEAD:refs/heads/${branch}`], worktree);
  console.log(JSON.stringify({ project: projectName, branch, phase, round, changed: true, pushed: shouldPush, fileCount: files.length, sourceFiles: sourceFiles.length }));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
