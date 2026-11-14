#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const secretPatterns = [
  /(?:AIza[0-9A-Za-z_-]{20,}|(?:sk|ghp|github_pat)[_-][A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._~+/=-]+)/gi,
  /((?:password|passwd|pwd|secret|apiKey|api_key|token|authorization|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["']?)([^\s"';,}]+)/gi,
];
const localPathPattern = /(?:[A-Za-z]:[\\/]|\\\\)[^\s"'`]+/g;
const passing = new Set(['pass', 'passed', 'success', 'verified', 'complete']);

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
  const checksPass = checks.length === 0 || checks.every((value) => passing.has(String(value).toLowerCase()));
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
  return `Outcome: ${redactTrainingText(record.outcome || 'complete', 60)}.\nChecks: ${checks}.\n${evidence}\nKeep changes inside the approved scope and report changed paths, tests and remaining uncertainty.`;
}

function toEvaluationRecord(record, source) {
  const accepted = isAccepted(record);
  return {
    schema: 'mansoor.agent-evaluation-example/v1',
    taskId: redactTrainingText(record.taskId, 120),
    projectId: redactTrainingText(record.projectId, 120),
    domain: redactTrainingText(record.domain || 'unknown', 80),
    objective: redactTrainingText(record.objective || '', 1000),
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
  const output = path.resolve(outputDir || path.join(root, '.agents', 'training-pack'));
  await fs.mkdir(output, { recursive: true });
  const metricFile = path.join(root, '.agents', 'ultra-v4', 'metrics', 'tasks.jsonl');
  const traceDir = path.join(root, '.agents', 'ultra-v3', 'traces');
  const researchFile = path.join(root, '.agents', 'memory', 'research-ledger.jsonl');
  const verificationFile = path.join(root, '.agents', 'memory', 'verification-ledger.jsonl');
  const metricRecords = (await readJsonl(metricFile)).filter((record) => !projectId || record.projectId === projectId);
  const traceFiles = await fs.readdir(traceDir, { withFileTypes: true }).catch(() => []);
  const evidenceSources = [
    { file: researchFile, kind: 'research' },
    { file: verificationFile, kind: 'verification' },
    ...traceFiles.filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl')).map((entry) => ({ file: path.join(traceDir, entry.name), kind: 'trace' })),
  ];
  const existingSources = [];
  for (const file of [metricFile, ...evidenceSources.map((item) => item.file)]) {
    try { existingSources.push({ path: safeRelative(root, file), sha256: await sha256(file), records: (await readJsonl(file)).length }); } catch { /* optional source */ }
  }
  const source = { projectDir: root, file: metricFile };
  const evaluation = metricRecords.map((record) => toEvaluationRecord(record, source));
  const sft = metricRecords.filter(isAccepted).map((record) => toSftRecord(record, source));
  const hardCases = evaluation.filter((record) => !record.accepted || record.failureCode || record.challengeType);
  const research = [];
  for (const item of evidenceSources) {
    for (const record of await readJsonl(item.file)) {
      if (projectId && record.projectId && record.projectId !== projectId) continue;
      research.push(toEvidenceRecord(record, { projectDir: root, file: item.file }, item.kind));
    }
  }
  await writeJsonl(path.join(output, 'sft.jsonl'), sft);
  await writeJsonl(path.join(output, 'evaluation.jsonl'), evaluation);
  await writeJsonl(path.join(output, 'hard-cases.jsonl'), hardCases);
  await writeJsonl(path.join(output, 'evidence.jsonl'), research);
  const manifest = {
    schema: 'mansoor.agent-training-pack/v1',
    generatedAt: new Date().toISOString(),
    projectId: projectId || null,
    projectRoot: '[PROJECT_ROOT]',
    redacted: true,
    hiddenReasoningIncluded: false,
    credentialsIncluded: false,
    policy: {
      sft: 'owner-approved successful outcomes only',
      evaluation: 'all sanitized observations',
      hardCases: 'failures, blockers and explicitly marked challenge cases',
      evidence: 'sanitized research/verification/trace metadata only',
    },
    files: {
      sft: { path: 'sft.jsonl', records: sft.length, sha256: await sha256(path.join(output, 'sft.jsonl')) },
      evaluation: { path: 'evaluation.jsonl', records: evaluation.length, sha256: await sha256(path.join(output, 'evaluation.jsonl')) },
      hardCases: { path: 'hard-cases.jsonl', records: hardCases.length, sha256: await sha256(path.join(output, 'hard-cases.jsonl')) },
      evidence: { path: 'evidence.jsonl', records: research.length, sha256: await sha256(path.join(output, 'evidence.jsonl')) },
    },
    sourceFiles: existingSources,
  };
  await fs.writeFile(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { outputDir: output, manifest, counts: { sft: sft.length, evaluation: evaluation.length, hardCases: hardCases.length, evidence: research.length } };
}

function getArg(args, name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const action = args[0] || 'export';
  if (action !== 'export') throw new Error('Usage: node tools/agent-training-dataset.mjs export --dir <project> --out <folder> [--project-id <id>]');
  buildTrainingPack({ projectDir: getArg(args, '--dir', process.cwd()), outputDir: getArg(args, '--out'), projectId: getArg(args, '--project-id') || null })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(`Training dataset export failed: ${error.message}`); process.exitCode = 1; });
}

