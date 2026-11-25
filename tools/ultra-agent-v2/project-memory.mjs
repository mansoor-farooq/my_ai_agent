import fs from 'node:fs';
import path from 'node:path';

function writeIfMissing(file, content) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, content, 'utf8');
}

export function ensureProjectMemory({ dir = process.cwd(), project }) {
  if (!project) throw new Error('Project identity is required to initialize project memory.');
  const memoryDir = path.join(path.resolve(dir), '.agents', 'memory');
  fs.mkdirSync(memoryDir, { recursive: true });
  const generated = new Date().toISOString();
  const header = `# Project Memory\n\n- Schema: 1\n- Generated: ${generated}\n- Project: ${project.name}\n- Project ID: ${project.projectId}\n- Git URL: ${project.gitUrl || 'not provided'}\n- Branch: ${project.branch || 'detached-or-unknown'}\n- Commit: ${project.commit || 'unknown'}\n\nThis is an evidence cache. Re-check source before security, money, persistence or irreversible decisions. Hidden reasoning, secrets, customer data and raw unrelated chats are never stored here.\n`;
  writeIfMissing(path.join(memoryDir, 'PROJECT_MEMORY.md'), header);
  writeIfMissing(path.join(memoryDir, 'project-map.md'), `# Project Map\n\n- Last refreshed: ${generated}\n- Entry point and affected flow: pending repository discovery\n- Manifests: pending preflight\n- Data boundaries: pending repository discovery\n- Verification command: pending\n`);
  writeIfMissing(path.join(memoryDir, 'decisions.md'), '# Decisions\n\nRecord: question → observed evidence → options → decision → verification → reversal condition.\n');
  writeIfMissing(path.join(memoryDir, 'change-log.md'), '# Change Log\n\n');
  writeIfMissing(path.join(memoryDir, 'open-questions.md'), '# Open Questions\n\n');
  writeIfMissing(path.join(memoryDir, 'research-ledger.jsonl'), '');
  writeIfMissing(path.join(memoryDir, 'verification-ledger.jsonl'), '');
  return { ok: true, command: 'init', memoryDir, project };
}
