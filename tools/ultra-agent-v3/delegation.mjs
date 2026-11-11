#!/usr/bin/env node
import path from 'node:path';

function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').toLowerCase().replace(/^\.\//, '');
}

function pathPrefix(value) {
  const normalized = normalizePath(value);
  const wildcard = normalized.search(/[?*\[{]/);
  return (wildcard >= 0 ? normalized.slice(0, wildcard) : normalized).replace(/\/$/, '');
}

function writersOverlap(left, right) {
  if (left.readOnly || right.readOnly) return false;
  if (!left.ownedPaths.length || !right.ownedPaths.length) return true;
  return left.ownedPaths.some((leftPath) => right.ownedPaths.some((rightPath) => {
    const a = pathPrefix(leftPath);
    const b = pathPrefix(rightPath);
    return !a || !b || a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
  }));
}

function normalizeWorkItem(item, index) {
  const id = String(item?.id || item?.name || item?.role || `work-${index + 1}`);
  return {
    id,
    role: String(item?.role || id),
    scope: String(item?.scope || ''),
    deliverable: String(item?.deliverable || ''),
    readOnly: Boolean(item?.readOnly),
    ownedPaths: [...new Set((Array.isArray(item?.ownedPaths) ? item.ownedPaths : []).map(normalizePath).filter(Boolean))],
    dependsOn: [...new Set((Array.isArray(item?.dependsOn) ? item.dependsOn : []).map(String).filter(Boolean))],
  };
}

function scheduleDelegation({ workItems = [], maxParallel = 3 } = {}) {
  const cap = Math.max(1, Math.min(Number(maxParallel) || 3, 3));
  const items = workItems.map(normalizeWorkItem);
  const blockers = [];
  const ids = new Set();
  for (const item of items) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(item.id)) blockers.push({ code: 'invalid-work-item-id', workItemId: item.id });
    if (ids.has(item.id)) blockers.push({ code: 'duplicate-work-item-id', workItemId: item.id });
    ids.add(item.id);
  }
  for (const item of items) {
    for (const dependency of item.dependsOn) if (!ids.has(dependency)) blockers.push({ code: 'missing-dependency', workItemId: item.id, dependency });
  }
  if (blockers.length) return { maxParallel: cap, waves: [], blockers };

  const remaining = new Map(items.map((item) => [item.id, item]));
  const completed = new Set();
  const waves = [];
  while (remaining.size) {
    const ready = [...remaining.values()].filter((item) => item.dependsOn.every((dependency) => completed.has(dependency))).sort((a, b) => a.id.localeCompare(b.id));
    if (!ready.length) {
      blockers.push({ code: 'dependency-cycle', workItemIds: [...remaining.keys()].sort() });
      break;
    }
    const selected = [];
    for (const candidate of ready) {
      if (selected.length >= cap) break;
      if (selected.every((item) => !writersOverlap(item, candidate))) selected.push(candidate);
    }
    if (!selected.length) selected.push(ready[0]);
    waves.push({ index: waves.length + 1, parallel: selected.length > 1, workItemIds: selected.map((item) => item.id) });
    for (const item of selected) {
      remaining.delete(item.id);
      completed.add(item.id);
    }
  }
  return { maxParallel: cap, waves, blockers };
}

export function mergeWaveResults(results = []) {
  const normalized = [...results].sort((a, b) => String(a?.workItemId || '').localeCompare(String(b?.workItemId || '')));
  return {
    schema: 'mansoor.delegation-wave-result/v1',
    workItemIds: normalized.map((result) => String(result?.workItemId || '')).filter(Boolean),
    changedPaths: [...new Set(normalized.flatMap((result) => Array.isArray(result?.changedPaths) ? result.changedPaths.map(String) : []))].sort(),
    blockers: normalized.flatMap((result) => Array.isArray(result?.blockers) ? result.blockers : []),
    results: normalized,
    status: normalized.some((result) => result?.status === 'blocked' || result?.status === 'failed') ? 'blocked' : normalized.every((result) => result?.status === 'complete') ? 'complete' : 'partial',
  };
}

export { scheduleDelegation };

if (process.argv[1] && path.basename(process.argv[1]) === 'delegation.mjs') {
  const args = process.argv.slice(2);
  const getArg = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
  const raw = getArg('--work-items', '[]');
  let workItems;
  try { workItems = JSON.parse(raw); } catch { throw new Error('--work-items must be a JSON array'); }
  if (!Array.isArray(workItems)) throw new Error('--work-items must be a JSON array');
  console.log(JSON.stringify(scheduleDelegation({ workItems, maxParallel: getArg('--max-parallel', '3') }), null, 2));
}
