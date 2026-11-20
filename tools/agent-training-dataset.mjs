#!/usr/bin/env node

import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const secretPatterns = [
  /(?:AIza[0-9A-Za-z_-]{20,}|(?:sk|ghp|github_pat)[_-][A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._~+/=-]+)/gi,
  /((?:password|passwd|pwd|secret|apiKey|api_key|token|authorization|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["']?)([^\s"';,}]+)/gi,
];
const localPathPattern = /(?:[A-Za-z]:[\\/]|\\\\)[^\s"'`]+/g;
const passing = new Set(['pass', 'passed', 'success', 'verified', 'complete']);
const DATASET_FOLDER = 'Mansoor AI Team Manager';

export function redactTrainingText(value, limit = 2000) {
  let text = String(value ?? '');
  for (const pattern of secretPatterns) {
    text = text.replace(pattern, (...matches) => matches.length > 2 && typeof matches[1] === 'string'
      ? `${matches[1]}[REDACTED_SECRET]`
      : '[REDACTED_SECRET]');
  }
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '[REDACTED_REASONING]');
  return text.replace(localPathPattern, '[LOCAL_PATH]').slice(0, limit);
}

const safeOwnerId = (value) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(String(value || '')) ? String(value) : null;

export function getTrainingDatasetRoot({ env = process.env, platform = process.platform, home = os.homedir(), dDriveAvailable = fsSync.existsSync('D:\\') } = {}) {
  const override = String(env.MANSOOR_AGENT_DATASET_ROOT || '').trim();
  if (override) return path.resolve(override);
  if (platform === 'win32' && dDriveAvailable) return path.win32.join('D:\\', 'Mansoor AI Team Manager', 'Agent Knowledge Datasets');
  const dataHome = env.LOCALAPPDATA || env.XDG_DATA_HOME || path.join(home, '.local', 'share');
  return path.join(dataHome, 'Mansoor AI Team Manager', 'Agent Knowledge Datasets');
}

function projectFolderName(projectDir, projectId) {
  const label = String(projectId || path.basename(path.resolve(projectDir || process.cwd())) || 'project')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return !label || label === '.' || label === '..' ? 'project' : label;
}

export function getTrainingDatasetDirectory({ projectDir = process.cwd(), projectId = null, root = getTrainingDatasetRoot() } = {}) {
  return path.join(root, projectFolderName(projectDir, projectId), DATASET_FOLDER);
}

function parseJsonl(text) {
  return String(text ?? '').split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

async function readJsonl(file) {
  try { return parseJsonl(await fs.readFile(file, 'utf8')); } catch { return []; }
}

async function sha256(file) {
  return `sha256:${crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')}`;
}

function safeRelative(projectDir, file) {
  return path.relative(projectDir, file).replaceAll('\\', '/') || path.basename(file);
}

function isAccepted(record) {
  const outcome = passing.has(String(record.outcome ?? '').toLowerCase());
  const checks = Array.isArray(record.acceptanceChecks) ? record.acceptanceChecks : [];
  const checksPass = checks.length > 0 && checks.every((value) => passing.has(String(value).toLowerCase()));
  return outcome && checksPass && record.reviewStatus === 'approved' && String(record.approvedBy ?? '').trim().length > 0;
}

function taskPrompt(record) {
  const objective = redactTrainingText(record.objective || `Complete task ${record.taskId || 'unknown'}`);
  const acceptance = (Array.isArray(record.acceptance) ? record.acceptance : Array.isArray(record.acceptanceChecks) ? record.acceptanceChecks : [])
    .map((item) => redactTrainingText(item, 400));
  return `${objective}${acceptance.length ? `\nAcceptance criteria:\n- ${acceptance.join('\n- ')}` : ''}`;
}

function assistantTarget(record) {
  const checks = Array.isArray(record.acceptanceChecks) ? record.acceptanceChecks.map((item) => redactTrainingText(item, 120)).join(', ') : 'recorded';
  const evidence = record.failureReason ? `Blocker observed: ${redactTrainingText(record.failureReason, 300)}.` : 'Evidence-backed verification was recorded.';
  const observedSummary = redactTrainingText(record.responseSummary || '', 1500);
  return `${observedSummary ? `${observedSummary}\n` : ''}Outcome: ${redactTrainingText(record.outcome || 'complete', 60)}.\nChecks: ${checks}.\n${evidence}\nKeep changes inside the approved scope and report changed paths, tests and remaining uncertainty.`;
}

function toEvaluationRecord(record, source) {
  const accepted = isAccepted(record);
  return {
    schema: 'mansoor.agent-evaluation-example/v1',
    taskId: redactTrainingText(record.taskId, 120),
    agentId: safeOwnerId(record.agentId),
    managerId: safeOwnerId(record.managerId),
    projectId: redactTrainingText(record.projectId, 120),
    domain: redactTrainingText(record.domain || 'unknown', 80),
    objective: redactTrainingText(record.objective || '', 1000),
    responseSummary: redactTrainingText(record.responseSummary || '', 1500),
    acceptance: (Array.isArray(record.acceptance) ? record.acceptance : []).map((item) => redactTrainingText(item, 300)),
    outcome: redactTrainingText(record.outcome || 'unknown', 60),
    accepted,
    failureCode: record.failureCode ? redactTrainingText(record.failureCode, 120) : null,
    failureReason: record.failureReason ? redactTrainingText(record.failureReason, 500) : null,
    challengeType: record.challengeType ? redactTrainingText(record.challengeType, 120) : null,
    latencyMs: Number.isFinite(Number(record.durationMs)) ? Number(record.durationMs) : null,
    source: safeRelative(path.resolve(source.projectDir), source.file),
  };
}

function toSftRecord(record, source) {
  return {
    schema: 'mansoor.agent-sft-example/v1',
    messages: [
      { role: 'system', content: 'You are Mansoor AI Team Manager. Plan within scope, preserve project contracts, use evidence, verify independently and never invent tool results.' },
      { role: 'user', content: taskPrompt(record) },
      { role: 'assistant', content: assistantTarget(record) },
    ],
    metadata: {
      taskId: redactTrainingText(record.taskId, 120),
      agentId: safeOwnerId(record.agentId),
      managerId: safeOwnerId(record.managerId),
      projectId: redactTrainingText(record.projectId, 120),
      domain: redactTrainingText(record.domain || 'unknown', 80),
      challengeType: record.challengeType ? redactTrainingText(record.challengeType, 120) : null,
      reviewStatus: 'approved',
      source: safeRelative(path.resolve(source.projectDir), source.file),
    },
  };
}

function toEvidenceRecord(record, source, kind) {
  return {
    schema: 'mansoor.agent-evidence-example/v1',
    kind,
    projectId: redactTrainingText(record.projectId, 120),
    taskId: redactTrainingText(record.taskId || record.id || '', 120),
    agentId: safeOwnerId(record.agentId),
    managerId: safeOwnerId(record.managerId),
    status: redactTrainingText(record.status || record.outcome || 'observed', 60),
    subject: redactTrainingText(record.subject || record.event || '', 200),
    claim: redactTrainingText(record.claim || record.details || record.result || '', 1200),
    sourceRef: safeRelative(path.resolve(source.projectDir), source.file),
  };
}

async function writeJsonl(file, records) {
  const body = records.length ? `${records.map((record) => JSON.stringify(record)).join('\n')}\n` : '';
  await fs.writeFile(file, body, 'utf8');
}

export async function buildTrainingPack({ projectDir = process.cwd(), outputDir, projectId = null } = {}) {
  const root = path.resolve(projectDir);
  const output = path.resolve(outputDir || getTrainingDatasetDirectory({ projectDir: root, projectId }));
  await fs.mkdir(output, { recursive: true });
  const metricFile = path.join(root, '.agents', 'ultra-v4', 'metrics', 'tasks.jsonl');
  const reviewFile = path.join(root, '.agents', 'ultra-v4', 'metrics', 'reviews.jsonl');
  const traceDir = path.join(root, '.agents', 'ultra-v3', 'traces');
  const researchFile = path.join(root, '.agents', 'memory', 'research-ledger.jsonl');
  const verificationFile = path.join(root, '.agents', 'memory', 'verification-ledger.jsonl');
  const managerId = 'mansoor-ai-team-manager';
  const reviews = await readJsonl(reviewFile);
  const latestReviews = new Map();
  for (const review of reviews) latestReviews.set(review.metricId || `task:${review.taskId}`, review);
  const allMetrics = (await readJsonl(metricFile)).map((record) => {
    const review = latestReviews.get(record.metricId || `task:${record.taskId}`);
    return review ? { ...record, reviewStatus: review.status, approvedBy: review.approvedBy } : record;
  }).filter((record) => !projectId || record.projectId === projectId);
  const metricRecords = allMetrics.filter((record) => !record.managerId || record.managerId === managerId);
  const traceFiles = await fs.readdir(traceDir, { withFileTypes: true }).catch(() => []);
  const evidenceSources = [
    { file: researchFile, kind: 'research' },
    { file: verificationFile, kind: 'verification' },
    ...traceFiles.filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl')).map((entry) => ({ file: path.join(traceDir, entry.name), kind: 'trace' })),
  ];
  const existingSources = [];
  for (const file of [metricFile, reviewFile, ...evidenceSources.map((item) => item.file)]) {
    try { existingSources.push({ path: safeRelative(root, file), sha256: await sha256(file), records: (await readJsonl(file)).length }); } catch { /* optional source */ }
  }
  const source = { projectDir: root, file: metricFile };
  const research = [];
  for (const item of evidenceSources) {
    for (const record of await readJsonl(item.file)) {
      if (projectId && record.projectId && record.projectId !== projectId) continue;
      research.push(toEvidenceRecord(record, { projectDir: root, file: item.file }, item.kind));
    }
  }
  const writePack = async (targetDir, records, owner, ownerId, evidenceRecords = research) => {
    await fs.mkdir(targetDir, { recursive: true });
    const evaluation = records.map((record) => toEvaluationRecord(record, source));
    const sft = records.filter(isAccepted).map((record) => toSftRecord(record, source));
    const hardCases = evaluation.filter((record) => !record.accepted || record.failureCode || record.challengeType);
    await writeJsonl(path.join(targetDir, 'sft.jsonl'), sft);
    await writeJsonl(path.join(targetDir, 'evaluation.jsonl'), evaluation);
    await writeJsonl(path.join(targetDir, 'hard-cases.jsonl'), hardCases);
    await writeJsonl(path.join(targetDir, 'evidence.jsonl'), evidenceRecords);
    const counts = { sft: sft.length, evaluation: evaluation.length, hardCases: hardCases.length, evidence: evidenceRecords.length };
    const manifest = {
      schema: 'mansoor.agent-training-pack/v1',
      generatedAt: new Date().toISOString(),
      datasetOwner: owner,
      ownerId,
      managerId,
      projectId: projectId || null,
      projectRoot: '[PROJECT_ROOT]',
      redacted: true,
      hiddenReasoningIncluded: false,
      credentialsIncluded: false,
      policy: {
        sft: 'owner-approved successful outcomes only',
        evaluation: 'all sanitized observations for this dataset owner',
        hardCases: 'failures, blockers and explicitly marked challenge cases',
        evidence: 'sanitized research/verification/trace metadata only',
      },
      files: {
        sft: { path: 'sft.jsonl', records: sft.length, sha256: await sha256(path.join(targetDir, 'sft.jsonl')) },
        evaluation: { path: 'evaluation.jsonl', records: evaluation.length, sha256: await sha256(path.join(targetDir, 'evaluation.jsonl')) },
        hardCases: { path: 'hard-cases.jsonl', records: hardCases.length, sha256: await sha256(path.join(targetDir, 'hard-cases.jsonl')) },
        evidence: { path: 'evidence.jsonl', records: evidenceRecords.length, sha256: await sha256(path.join(targetDir, 'evidence.jsonl')) },
      },
      sourceFiles: existingSources,
    };
    await fs.writeFile(path.join(targetDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return { manifest, counts };
  };
  const managerPack = await writePack(output, metricRecords, DATASET_FOLDER, managerId);
  const agentGroups = new Map();
  for (const record of metricRecords) {
    const agentId = safeOwnerId(record.agentId);
    if (agentId) agentGroups.set(agentId, [...(agentGroups.get(agentId) || []), record]);
  }
  const agentDatasets = {};
  for (const [agentId, records] of agentGroups) {
    const pack = await writePack(path.join(output, 'agents', agentId), records, agentId, agentId, research.filter((item) => item.agentId === agentId));
    agentDatasets[agentId] = { path: `agents/${agentId}`, records: records.length, counts: pack.counts };
  }
  managerPack.manifest.agentDatasets = agentDatasets;
  await fs.writeFile(path.join(output, 'manifest.json'), `${JSON.stringify(managerPack.manifest, null, 2)}\n`, 'utf8');
  return { outputDir: output, manifest: managerPack.manifest, counts: managerPack.counts };
}

function getArg(args, name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const action = args[0] || 'export';
  if (action !== 'export') throw new Error('Usage: node tools/agent-training-dataset.mjs export --dir <project> --out <folder> [--project-id <id>]');
  const projectDir = getArg(args, '--dir', process.cwd());
  const projectId = getArg(args, '--project-id') || null;
  buildTrainingPack({ projectDir, outputDir: getArg(args, '--out', getTrainingDatasetDirectory({ projectDir, projectId })), projectId })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(`Training dataset export failed: ${error.message}`); process.exitCode = 1; });
}

