#!/usr/bin/env node

/**
 * Concurrency contract for the local planner.
 *
 * Normal work stays conservative so a small machine is not flooded. A Turbo
 * session may expose twenty independent worker slots, but dependency/path
 * safety still decides how many can actually enter a wave. The native host
 * remains authoritative: MANSOOR_HOST_MAX_PARALLEL can lower the ceiling when
 * a machine or provider reports a smaller capacity.
 */
export const DEFAULT_MAX_PARALLEL_WORKERS = 3;
export const TURBO_MAX_PARALLEL_WORKERS = 20;
export const HARD_MAX_PARALLEL_WORKERS = 20;

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function isTurboAutonomy(value) {
  const normalized = String(value || '').toLowerCase();
  return normalized === 'turbo' || normalized === 'turbo-autonomous' || normalized === 'manager-turbo-autonomous';
}

export function resolveParallelCapacity({
  requested,
  autonomy,
  parallelRequested = true,
  normalDefault = DEFAULT_MAX_PARALLEL_WORKERS,
  env = process.env,
} = {}) {
  if (!parallelRequested) return 1;
  const turbo = isTurboAutonomy(autonomy);
  const hostCap = positiveInteger(env?.MANSOOR_HOST_MAX_PARALLEL)
    || positiveInteger(env?.MANSOOR_MAX_PARALLEL_WORKERS)
    || HARD_MAX_PARALLEL_WORKERS;
  const defaultCapacity = turbo ? TURBO_MAX_PARALLEL_WORKERS : Math.max(1, Number(normalDefault) || DEFAULT_MAX_PARALLEL_WORKERS);
  const requestedCapacity = positiveInteger(requested) || defaultCapacity;
  return Math.max(1, Math.min(HARD_MAX_PARALLEL_WORKERS, hostCap, requestedCapacity));
}

export function concurrencyPolicy({ autonomy, capacity, hostCap = null } = {}) {
  const turbo = isTurboAutonomy(autonomy);
  return {
    schema: 'mansoor.parallel-concurrency/v1',
    mode: turbo ? 'turbo-bounded' : 'normal-bounded',
    maxWorkerSlots: Math.max(1, Math.min(HARD_MAX_PARALLEL_WORKERS, Number(capacity) || (turbo ? TURBO_MAX_PARALLEL_WORKERS : DEFAULT_MAX_PARALLEL_WORKERS))),
    hardCeiling: HARD_MAX_PARALLEL_WORKERS,
    hostCap: hostCap || 'host-reported-or-hard-ceiling',
    scheduling: 'dependency-and-path-safe-waves-with-backpressure',
    rules: [
      'Only independent work items may share a wave.',
      'Overlapping writer paths are serialized; read-only workers may fan out.',
      'No synthetic workers are created just to fill capacity.',
      'The host/provider may lower concurrency; the planner never bypasses it.',
    ],
  };
}

