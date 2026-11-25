import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = 'mansoor.context-intelligence/v2';
const DEFAULT_WINDOW = 8192;
const SECRET_PATTERN = /(?:AIza[0-9A-Za-z_-]{20,}|(?:sk|ghp|github_pat)[_-][A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._~+/=-]+|(?:password|passwd|pwd|secret|api[_-]?key|token|authorization)\s*[:=]\s*["']?[^\s"';,}]+)/gi;
const COMMON_SYMBOLS = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'Update', 'call', 'run']);

function clean(value) { return String(value ?? '').replace(SECRET_PATTERN, 'REDACTED_SECRET'); }
function cleanContextText(value) { return clean(value).replace(/(?:chain[-_ ]of[-_ ]thought|hidden reasoning|raw system prompt)\s*:?[^\n]*/gi, '[redacted-reasoning]'); }
function stable(value) { return JSON.stringify(value, Object.keys(value || {}).sort()); }
function sha256(value) { return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`; }
function sortedUnique(values) { return [...new Set((values || []).map((value) => String(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
function safePath(value) { const text = String(value || ''); return text && !text.startsWith('/') && !text.startsWith('\\') && !/^[A-Za-z]:/.test(text) && !text.split(/[\\/]/).includes('..'); }
function stripSensitive(value) {
  if (Array.isArray(value)) return value.map(stripSensitive);
  if (!value || typeof value !== 'object') return cleanContextText(value);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !/reasoning|chain[_-]?of[_-]?thought|system[_-]?prompt|raw[_-]?prompt/i.test(key)).map(([key, item]) => [key, stripSensitive(item)]));
}

export function estimateTokens(text = '') {
  const base = Math.ceil(String(text).length / 3.5);
  return Math.ceil(base * 1.1);
}

export function allocateBudget(modelId = 'host', totalWindow = DEFAULT_WINDOW) {
  const window = Math.max(1, Math.floor(Number(totalWindow) || DEFAULT_WINDOW));
  const target = {
    system_policy_reserve: Math.floor(window * 0.10),
    immutable_evidence: Math.floor(window * 0.20),
    active_deltas: Math.floor(window * 0.20),
    cached_digest: Math.floor(window * 0.20),
    compaction_summary: Math.floor(window * 0.10),
    output_reserve: Math.floor(window * 0.05),
  };
  const buckets = { ...target };
  const reasons = [];
  const ceiling = Math.floor(window * 0.85);
  let total = Object.values(buckets).reduce((sum, value) => sum + value, 0);
  for (const key of ['cached_digest', 'compaction_summary', 'active_deltas']) {
    if (total <= ceiling) break;
    const reduction = Math.min(buckets[key], total - ceiling);
    buckets[key] -= reduction;
    total -= reduction;
    if (reduction) reasons.push(`${key}-downshifted:${reduction}`);
  }
  return { version: 'v2', modelId: String(modelId), effective_window: window, ceiling_tokens: ceiling, buckets, truncation_or_resize_reason: reasons };
}

export function adaptiveContextMode(numCtx) {
  const value = Number(numCtx) || DEFAULT_WINDOW;
  return value < 16384 ? { taskSplit: 'single-module', digestGranularity: 'file' } : { taskSplit: 'multi-file', digestGranularity: 'module' };
}

export async function detectNumCtx(modelId, { probe, cache = new Map(), ttlMs = 300000, now = () => Date.now() } = {}) {
  const key = String(modelId || 'default');
  const hit = cache.get(key);
  if (hit && now() - hit.at < ttlMs) return hit.numCtx;
  let numCtx = null;
  if (typeof probe === 'function') {
    try { const result = await probe(key); numCtx = Number(result?.num_ctx || result?.numCtx || 0) || null; } catch { numCtx = null; }
  }
  cache.set(key, { at: now(), numCtx: numCtx || DEFAULT_WINDOW });
  return numCtx || DEFAULT_WINDOW;
}

function globMatches(filePath, patterns = []) {
  return patterns.some((pattern) => {
    const escaped = String(pattern).split('**').map((part) => part.split('*').map((piece) => piece.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*');
    return new RegExp(`^${escaped}$`).test(filePath) || new RegExp(`^${escaped.replace(/\/\$$/, '')}`).test(filePath);
  });
}

function inWorkerScope(filePath, workerScope = {}) {
  const patterns = Array.isArray(workerScope) ? workerScope : workerScope.paths || [];
  return !patterns.length || globMatches(filePath, patterns);
}

export function moduleDigest({ path: modulePath, files = [], runId = '', verifiedAt = null, status = 'fresh' } = {}) {
  const normalized = files.map((file) => ({ path: String(file.path), content: String(file.content ?? '').replace(/\r\n?/g, '\n') })).sort((a, b) => a.path.localeCompare(b.path));
  const contentTree = normalized.map((file) => `${file.path}\0${file.content}`).join('\n');
  return { path: String(modulePath || ''), content_tree_sha256: sha256(contentTree), source_fingerprint: sha256(contentTree), files: normalized, structured_summary: normalized.map((file) => `${file.path} (${file.content.length} bytes)`).join('\n'), last_verified_at: verifiedAt, verified_run_id: String(runId || ''), status };
}

export function invalidateModuleDigest(digest, { changedPaths = [], gitHeadChanged = false, dirty = false, parallelCommitPaths = [] } = {}) {
  const modulePath = String(digest?.path || '').replace(/\\/g, '/').replace(/\/$/, '');
  const overlaps = [...changedPaths, ...parallelCommitPaths].some((file) => String(file).replace(/\\/g, '/').startsWith(`${modulePath}/`) || String(file).replace(/\\/g, '/') === modulePath);
  return { ...digest, status: gitHeadChanged || (dirty && overlaps) || overlaps ? 'stale' : (digest?.status || 'fresh') };
}

export function commitDigest({ run = {}, digest } = {}) {
  if (run.verified !== true) { const error = new Error('UnverifiedCacheCommitError'); error.name = 'UnverifiedCacheCommitError'; throw error; }
  const validHash = /^sha256:[a-f0-9]{64}$/i.test(String(digest?.content_tree_sha256 || ''));
  const identityMatches = Boolean(digest?.verified_run_id) && (!run.runId || String(run.runId) === String(digest.verified_run_id));
  if (!digest || !safePath(digest.path) || !validHash || digest.source_fingerprint !== digest.content_tree_sha256 || digest.status !== 'fresh' || !identityMatches || !Array.isArray(digest.files) || !digest.files.length) { const error = new Error('DigestIntegrityError'); error.name = 'DigestIntegrityError'; throw error; }
  if (Array.isArray(digest.files)) {
    const recomputed = moduleDigest({ path: digest.path, files: digest.files }).content_tree_sha256;
    if (recomputed !== digest.content_tree_sha256) { const error = new Error('DigestIntegrityError'); error.name = 'DigestIntegrityError'; throw error; }
  }
  return { ...digest, status: 'fresh', committed: true };
}

export function recordFailureEvidence({ projectDir, runId, failureEvidence = {} } = {}) {
  const file = path.join(path.resolve(projectDir || process.cwd()), '.antigravity', 'cache', 'failures', `${String(runId || 'unknown').replace(/[^A-Za-z0-9_.-]/g, '_')}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const record = { version: 'v2', run_id: String(runId || ''), failure_evidence: stripSensitive(failureEvidence), cache_commit_status: 'held_unverified' };
  fs.writeFileSync(file, JSON.stringify(record, null, 2));
  return record;
}

export function createDigestStore({ projectDir, maxEntries = 512 } = {}) {
  const root = path.join(path.resolve(projectDir || process.cwd()), '.antigravity', 'cache', 'digests');
  fs.mkdirSync(root, { recursive: true });
  const keyFor = (modulePath) => crypto.createHash('sha256').update(String(modulePath)).digest('hex');
  return {
    root,
    read(modulePath) {
      const file = path.join(root, `${keyFor(modulePath)}.json`);
      if (!fs.existsSync(file)) return null;
      try { return commitDigest({ run: { verified: true }, digest: JSON.parse(fs.readFileSync(file, 'utf8')) }); } catch { return null; }
    },
    write({ run, digest }) {
      const verified = commitDigest({ run, digest });
      const file = path.join(root, `${keyFor(verified.path)}.json`);
      fs.writeFileSync(file, JSON.stringify({ ...verified, lruAt: Date.now() }, null, 2));
      const files = fs.readdirSync(root).filter((name) => name.endsWith('.json')).map((name) => ({ name, at: fs.statSync(path.join(root, name)).mtimeMs })).sort((a, b) => b.at - a.at);
      for (const stale of files.slice(maxEntries)) fs.rmSync(path.join(root, stale.name), { force: true });
      return verified;
    },
  };
}

export function selectNegativeContext(entries = [], { workerScope = [], blockers = [], limit = 5 } = {}) {
  const scope = Array.isArray(workerScope) ? workerScope : workerScope.paths || [];
  const blockerText = blockers.join(' ');
  return entries.filter((entry) => {
    const overlap = (entry.files_touched || []).some((file) => inWorkerScope(file, scope));
    return overlap || (entry.error_signature && blockerText.includes(entry.error_signature));
  }).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)) || String(a.failure_id || '').localeCompare(String(b.failure_id || ''))).slice(0, limit);
}

function negativeFile(projectDir, project) {
  return path.join(path.resolve(projectDir || process.cwd()), '.antigravity', 'cache', 'negative', `${String(project || 'default').replace(/[^A-Za-z0-9_.-]/g, '_')}.json`);
}

export function recordNegativeContext({ projectDir, project, runId, approachSignature, errorSignature, filesTouched = [], timestamp = new Date().toISOString() } = {}) {
  const file = negativeFile(projectDir, project);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const entries = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  const entry = { failure_id: sha256(`${runId}|${approachSignature}|${errorSignature}|${timestamp}`).slice(7, 23), approach_signature: clean(approachSignature), error_signature: clean(errorSignature), files_touched: sortedUnique(filesTouched.filter(safePath)), timestamp, run_id: String(runId || ''), status: 'open' };
  fs.writeFileSync(file, JSON.stringify([...entries, entry].slice(-512), null, 2));
  return entry;
}

export function createDriftStateStore({ projectDir, runId } = {}) {
  const file = path.join(path.resolve(projectDir || process.cwd()), '.antigravity', 'cache', 'drift', `${String(runId || 'default').replace(/[^A-Za-z0-9_.-]/g, '_')}.json`);
  const read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } };
  return {
    read(workerId) { return Number(read()[String(workerId)] || 0); },
    write(workerId, count) { fs.mkdirSync(path.dirname(file), { recursive: true }); const state = read(); state[String(workerId)] = Number(count); fs.writeFileSync(file, JSON.stringify(state, null, 2)); },
    clear(workerId) { const state = read(); delete state[String(workerId)]; fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(state, null, 2)); },
  };
}

export function resolveNegativeContext({ projectDir, project, filesTouched = [], errorSignature = '' } = {}) {
  const file = negativeFile(projectDir, project);
  if (!fs.existsSync(file)) return [];
  const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  const touched = new Set(filesTouched);
  const next = entries.map((entry) => ({ ...entry, status: (entry.files_touched || []).some((item) => touched.has(item)) || (errorSignature && entry.error_signature === errorSignature) ? 'resolved' : entry.status }));
  fs.writeFileSync(file, JSON.stringify(next, null, 2));
  return next;
}

export function evaluateDrift({ runId = 'default', workerId = '', report = {}, breachCount = 0, stateStore = null } = {}) {
  if (!evaluateDrift.state) evaluateDrift.state = new Map();
  const key = `${String(runId)}:${String(workerId || 'unknown')}`;
  if (!report.drift) { stateStore?.clear(workerId); evaluateDrift.state.delete(key); return { workerId: String(workerId), action: 'accept', breachCount: 0 }; }
  const previous = stateStore ? stateStore.read(workerId) : (evaluateDrift.state.get(key) || 0);
  const nextCount = previous + 1;
  if (stateStore) stateStore.write(workerId, nextCount); else evaluateDrift.state.set(key, nextCount);
  return { workerId: String(workerId), action: nextCount >= 2 ? 'escalate-context-unstable' : 'reprompt', breachCount: nextCount, correctedSymbols: report.unknownSymbols || [], correctedPaths: report.unknownPaths || [] };
}

export async function guardWorkerOutput({ runId = 'default', workerId = '', output = '', projectMap = {}, reprompt, stateStore = null, projectDir = null } = {}) {
  const durableStore = stateStore || (projectDir ? createDriftStateStore({ projectDir, runId }) : null);
  let report = detectContextDrift(output, projectMap);
  let decision = evaluateDrift({ runId, workerId, report, stateStore: durableStore });
  if (decision.action === 'reprompt' && typeof reprompt === 'function') {
    const corrected = await reprompt({ report, instruction: `These references do not exist: ${[...report.unknownPaths, ...report.unknownSymbols].join(', ')}` });
    report = detectContextDrift(corrected?.output || corrected || '', projectMap);
    decision = evaluateDrift({ runId, workerId, report, stateStore: durableStore });
  }
  return { accepted: !report.drift && decision.action !== 'escalate-context-unstable', report, decision, output };
}

export function distillToolOutput(rawOutput = '', toolName = 'tool') {
  const raw = String(rawOutput ?? '');
  let output = raw;
  let strategy = 'bounded-pass-through';
  if (raw.length > 4096) {
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : null;
      if (items) { output = JSON.stringify({ schema: 'distilled-json/v1', keys: Object.keys(parsed).sort(), count: items.length, first: items.slice(0, 2), last: items.slice(-2) }); strategy = 'json-summary'; }
    } catch { /* log path below */ }
  }
  if (strategy !== 'json-summary') {
    const lines = raw.replace(/\r\n?/g, '\n').split('\n');
    const failure = lines.filter((line) => /\b(FAIL|ERROR|Error|Assertion|exception|exit code|non-zero)\b|^\s*at\s/.test(line));
    if (/test|vitest|jest|mocha/i.test(toolName)) output = failure.join('\n');
    else if (lines.length > 500) output = [...lines.slice(0, 50), ...failure, ...lines.slice(-50)].filter((line, index, list) => list.indexOf(line) === index).join('\n');
    else if (/install|build|compile/i.test(toolName)) output = lines.filter((line) => /warn|error|fail|success|complete|exit code/i.test(line)).join('\n');
    strategy = strategy === 'bounded-pass-through' ? (output === raw ? 'pass-through' : 'log-filter') : strategy;
  }
  return { output: clean(output), report: { version: 'v2.1', toolName: String(toolName), strategy, inputBytes: raw.length, outputBytes: output.length, droppedLines: Math.max(0, raw.split('\n').length - output.split('\n').length) } };
}

export function compactContext({ acceptanceCriteria = [], anchors = [], summary = '', activeDeltas = [] } = {}) {
  if (anchors.some((anchor) => !safePath(anchor.path) || !Number.isInteger(Number(anchor.line)) || Number(anchor.line) < 1 || /reasoning|chain[_-]?of[_-]?thought/i.test(`${anchor.kind || ''} ${anchor.text || ''}`))) { const error = new Error('AnchorIntegrityError'); error.name = 'AnchorIntegrityError'; throw error; }
  const immutable = anchors.map((anchor) => ({ path: String(anchor.path), line: Number(anchor.line), text: String(anchor.text), kind: String(anchor.kind || 'evidence') }));
  return { version: 'v2', summary: clean(summary), acceptanceCriteria: sortedUnique(acceptanceCriteria), immutable_anchors: immutable, activeDeltas, anchors_verified: immutable.every((anchor, index) => anchor.text === anchors[index].text && anchor.path === anchors[index].path && anchor.line === Number(anchors[index].line)) };
}

export function recoverOverflow({ effectiveWindow, usedTokens, checkpoint } = {}) {
  if (Number(usedTokens) <= Number(effectiveWindow)) return { recovered: false, context: null };
  return { recovered: true, reason: 'checkpoint-rebuild-after-overflow', context: { acceptanceCriteria: checkpoint?.acceptanceCriteria || [], topFailureEvidence: checkpoint?.topFailureEvidence || [], activeDeltas: checkpoint?.activeDeltas || [] } };
}

function enforceContextCeiling(bundle) {
  const ceiling = bundle.budget.ceiling_tokens;
  const pruneKeys = ['cached_digest', 'high_level_digests', 'target_digests', 'active_deltas', 'negative_context', 'decisions', 'architecture_map'];
  const reasons = bundle.context_telemetry.truncation_or_resize_reason;
  const payload = () => {
    const { schema, version, runId, phase, workerScope, model, budget, security, context_telemetry, ...content } = bundle;
    return estimateTokens(JSON.stringify(content));
  };
  let estimated = payload();
  while (estimated > ceiling) {
    let pruned = false;
    for (const key of pruneKeys) {
      if (Array.isArray(bundle[key]) && bundle[key].length) {
        bundle[key].pop();
        reasons.push(`${key}-pruned-for-window`);
        pruned = true;
        break;
      }
    }
    if (!pruned && bundle.compaction_summary) {
      bundle.compaction_summary = bundle.compaction_summary.slice(0, Math.max(0, Math.floor(bundle.compaction_summary.length / 2)));
      reasons.push('compaction_summary-downshifted');
      pruned = true;
    }
    if (!pruned) { reasons.push('immutable-evidence-exceeds-window'); bundle.status = 'context-overflow-recoverable'; bundle.context_telemetry.overflow = true; break; }
    estimated = payload();
  }
  bundle.context_telemetry.estimated_tokens = estimated;
  return bundle;
}

export function detectContextDrift(workerOutput = '', verifiedProjectMap = {}) {
  const text = String(workerOutput);
  const paths = [...text.matchAll(/(?:[A-Za-z0-9_.-]+[\\/])+[A-Za-z0-9_.-]+\.[A-Za-z0-9]+/g)].map((match) => match[0].replace(/\\/g, '/'));
  const symbols = [...text.matchAll(/\b[A-Za-z_$][A-Za-z0-9_$]*\s*\(/g)].map((match) => match[0].replace(/\s*\($/, '')).filter((symbol) => !COMMON_SYMBOLS.has(symbol));
  const knownPaths = new Set((verifiedProjectMap.paths || []).map((value) => String(value).replace(/\\/g, '/')));
  const knownSymbols = new Set((verifiedProjectMap.symbols || []).map(String));
  const unknownPaths = sortedUnique(paths.filter((value) => !knownPaths.has(value)));
  const unknownSymbols = sortedUnique(symbols.filter((value) => !knownSymbols.has(value)));
  return { version: 'v2.1', drift: unknownPaths.length > 0 || unknownSymbols.length > 0, unknownPaths, unknownSymbols, action: unknownPaths.length || unknownSymbols.length ? 'reprompt-and-do-not-accept' : 'accept' };
}

export function assembleContextBundle({ runId = '', phase = 'planning', workerScope = {}, modelId = 'host', totalWindow = DEFAULT_WINDOW, acceptanceCriteria = [], blockers = [], projectMap = {}, fileDeltas = [], digests = [], decisions = [], negativeContext = [], toolOutputs = [], handoff = {}, failureEvidence = [] } = {}) {
  const budget = allocateBudget(modelId, totalWindow);
  const mode = adaptiveContextMode(totalWindow);
  const visibleDeltas = fileDeltas.filter((item) => safePath(item.path) && inWorkerScope(item.path, workerScope)).map((item) => ({ path: item.path, content: cleanContextText(item.content).replace(/REDACTED_SECRET/g, '[redacted-value]') })).sort((a, b) => a.path.localeCompare(b.path));
  const visibleDigests = digests.filter((item) => inWorkerScope(item.path, workerScope)).sort((a, b) => String(a.path).localeCompare(String(b.path))).map((item) => ({ ...item, structured_summary: cleanContextText(item.structured_summary) }));
  const selectedNegative = selectNegativeContext(negativeContext, { workerScope, blockers });
  const distilled = toolOutputs.map((item) => distillToolOutput(item.output, item.toolName));
  const phaseData = phase === 'coding' ? { target_digests: visibleDigests, active_deltas: visibleDeltas, dependent_signatures: stripSensitive(projectMap.dependentSignatures || []) } : phase === 'testing' ? { active_deltas: visibleDeltas, failure_evidence: stripSensitive(failureEvidence), test_commands: sortedUnique(projectMap.testCommands || []) } : phase === 'handoff' ? { active_deltas: visibleDeltas, handoff: stripSensitive(handoff) } : { architecture_map: stripSensitive(projectMap.architecture || projectMap.paths || []), high_level_digests: visibleDigests };
  const bundle = { schema: SCHEMA, version: 'v2', runId: String(runId), phase: String(phase), workerScope: { role: String(workerScope.role || 'manager'), paths: sortedUnique(workerScope.paths || []) }, model: { id: String(modelId), mode: mode.taskSplit, digestGranularity: mode.digestGranularity }, budget, acceptanceCriteria: sortedUnique(acceptanceCriteria), blockers: sortedUnique(blockers.map(cleanContextText)), negative_context: selectedNegative.map((entry) => stripSensitive({ ...entry, error_signature: cleanContextText(entry.error_signature) })), decisions: decisions.map(cleanContextText).sort(), ...phaseData, compaction_summary: cleanContextText(handoff.compactionSummary || ''), security: { raw_reasoning_stripped: true, secrets_redacted_at_assembly: true }, context_telemetry: { version: 'v2', estimated_tokens: estimateTokens(JSON.stringify(phaseData)), cache_hit: visibleDigests.some((digest) => digest.status === 'fresh'), distillation_reports: distilled.map((item) => item.report), truncation_or_resize_reason: budget.truncation_or_resize_reason } };
  if (phase === 'handoff') bundle.handoff = { summary: cleanContextText(handoff.summary || ''), verified_evidence: sortedUnique(handoff.verifiedEvidence || []), changed_paths: sortedUnique(visibleDeltas.map((item) => item.path)), blockers: sortedUnique(blockers), cache_commit_status: handoff.cacheCommitStatus || 'held_unverified', recommended_next_action: cleanContextText(handoff.recommendedNextAction || 'review-handoff') };
  return enforceContextCeiling(bundle);
}

export function createContextSchemas() {
  const base = { type: 'object', additionalProperties: true, properties: { version: { type: 'string' } } };
  return {
    ContextBundle: { ...base, properties: { ...base.properties, schema: { const: SCHEMA }, runId: { type: 'string' }, phase: { type: 'string' } } },
    BudgetAllocation: { ...base, properties: { ...base.properties, effective_window: { type: 'integer' }, buckets: { type: 'object' } } },
    ModuleDigest: { ...base, properties: { ...base.properties, path: { type: 'string' }, content_tree_sha256: { type: 'string' }, status: { enum: ['fresh', 'stale', 'building'] } } },
    DriftReport: { ...base, properties: { ...base.properties, drift: { type: 'boolean' }, unknownPaths: { type: 'array' }, unknownSymbols: { type: 'array' } } },
    DistillationReport: { ...base, properties: { ...base.properties, strategy: { type: 'string' }, droppedLines: { type: 'integer' } } },
    ContextTelemetry: { ...base, properties: { ...base.properties, estimated_tokens: { type: 'integer' }, cache_hit: { type: 'boolean' } } },
    HandoffBundle: { ...base, properties: { ...base.properties, summary: { type: 'string' }, changed_paths: { type: 'array' } } },
  };
}

export { SCHEMA as CONTEXT_INTELLIGENCE_SCHEMA };
