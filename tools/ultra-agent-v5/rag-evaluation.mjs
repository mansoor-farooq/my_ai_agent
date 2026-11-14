#!/usr/bin/env node

function scoreAtRank(rank) { return 1 / Math.log2(rank + 2); }

function evaluateMode(queries, resultsByMode, mode, k) {
  let recall = 0;
  let mrr = 0;
  let ndcg = 0;
  for (const query of queries) {
    const relevant = new Set((Array.isArray(query.relevantIds) ? query.relevantIds : []).map(String));
    const results = Array.isArray(resultsByMode?.[mode]?.[query.id]) ? resultsByMode[mode][query.id].map(String).slice(0, k) : [];
    const hits = results.filter((id) => relevant.has(id));
    recall += relevant.size ? new Set(hits).size / relevant.size : 0;
    const first = results.findIndex((id) => relevant.has(id));
    if (first >= 0) mrr += 1 / (first + 1);
    const dcg = results.reduce((total, id, index) => total + (relevant.has(id) ? scoreAtRank(index) : 0), 0);
    const ideal = [...relevant].slice(0, k).reduce((total, _id, index) => total + scoreAtRank(index), 0);
    ndcg += ideal ? dcg / ideal : 0;
  }
  const count = queries.length || 1;
  return { queries: queries.length, k, recallAtK: recall / count, mrr: mrr / count, ndcgAtK: ndcg / count };
}

export function evaluateRetrieval({ queries = [], resultsByMode = {}, k = 5 } = {}) {
  const normalizedQueries = (Array.isArray(queries) ? queries : []).map((query) => ({ id: String(query.id), relevantIds: Array.isArray(query.relevantIds) ? query.relevantIds.map(String) : [] }));
  const modes = Object.fromEntries(Object.keys(resultsByMode || {}).map((mode) => [mode, evaluateMode(normalizedQueries, resultsByMode, mode, Math.max(1, Number(k) || 5))]));
  return { schema: 'mansoor.v5-rag-evaluation/v1', modes, queryCount: normalizedQueries.length };
}

export function evaluateMemoryEvidence({ facts = [], projectId = '', contractVersion = '', now = new Date(), maxAgeMs = 30 * 24 * 60 * 60 * 1000, allowedVisibility = ['project'] } = {}) {
  const expectedProject = String(projectId || '');
  const expectedContract = String(contractVersion || '');
  const nowMs = new Date(now).getTime();
  const blockers = [];
  const seen = new Map();
  let verified = 0;
  for (const fact of Array.isArray(facts) ? facts : []) {
    const id = String(fact?.id || 'unknown');
    if (String(fact?.projectId || '') !== expectedProject) blockers.push(`project-mismatch:${id}`);
    if (expectedContract && String(fact?.contractVersion || '') !== expectedContract) blockers.push(`contract-version-mismatch:${id}`);
    if (fact?.status !== 'verified') blockers.push(`fact-not-verified:${id}`);
    if (!Array.isArray(fact?.sourceRefs) || !fact.sourceRefs.length) blockers.push(`source-provenance-missing:${id}`);
    if (!/^sha256:[a-f0-9]{3,}$/i.test(String(fact?.contentHash || ''))) blockers.push(`content-hash-missing:${id}`);
    if (fact?.visibility && !allowedVisibility.includes(String(fact.visibility))) blockers.push(`visibility-denied:${id}`);
    const verifiedAt = new Date(fact?.verifiedAt || '').getTime();
    if (!Number.isFinite(verifiedAt) || !Number.isFinite(nowMs)) blockers.push(`verified-at-invalid:${id}`);
    else if (nowMs - verifiedAt > Number(maxAgeMs)) blockers.push(`stale:${id}`);
    const prior = seen.get(id);
    if (prior && prior !== fact.contentHash) blockers.push(`contradiction:${id}`);
    seen.set(id, fact?.contentHash);
    if (!blockers.some((item) => item.endsWith(`:${id}`)) && fact?.status === 'verified') verified += 1;
  }
  return {
    schema: 'mansoor.v5-memory-evidence/v1',
    allPassed: blockers.length === 0,
    total: Array.isArray(facts) ? facts.length : 0,
    verified,
    blockers: [...new Set(blockers)],
  };
}
